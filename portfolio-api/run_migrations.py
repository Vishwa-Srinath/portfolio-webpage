#!/usr/bin/env python3
"""
Database Migration Runner for Supabase/PostgreSQL.

Applies SQL migration files from the migrations/ directory sequentially.
Keeps a _schema_migrations table to track which files have already been applied,
so re-running the script is always safe (idempotent).

Usage:
    python run_migrations.py

Requirements:
    pip install psycopg2-binary python-dotenv
    (or install from requirements.txt inside the venv)

Environment variables (from .env or shell):
    SUPABASE_URL            — https://[ref].supabase.co
    SUPABASE_DB_PASSWORD    — Supabase database password
                              (prompted interactively if not set)
"""

from __future__ import annotations

import os
import sys
import re
import getpass
from pathlib import Path
from typing import Dict, Set

from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# Ensure psycopg2 is available
# ─────────────────────────────────────────────────────────────────────────────
try:
    import psycopg2
    import psycopg2.extensions
except ImportError:
    print("psycopg2-binary not found — installing into the virtual environment...")
    import subprocess
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "psycopg2-binary"],
            check=True,
        )
        import psycopg2
        import psycopg2.extensions
    except subprocess.CalledProcessError as e:
        print(f"Error installing psycopg2-binary: {e}", file=sys.stderr)
        print("Please run: pip install psycopg2-binary", file=sys.stderr)
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# Map: migration filename → table name that proves it has already run.
# Used to auto-mark migrations as applied when the DB was set up manually
# or when _schema_migrations was reset.
# ─────────────────────────────────────────────────────────────────────────────
MIGRATION_TABLE_MAP: Dict[str, str] = {
    "20260101000001_initial_schema.sql":  "messages",
    "20260101000002_rls_policies.sql":    "messages",          # same table, just RLS
    "20260201000001_v2_embeddings.sql":   "content_embeddings",
    "20260705000001_profile.sql":         "profile",
    "20260705000002_external_links.sql":  "external_links",
    "20260705000003_tags.sql":            "tags",
    "20260705000004_content_series.sql":  "content_series",
    "20260705000005_content_items.sql":   "content_items",
    "20260705000006_content_tags.sql":    "content_tags",
    "20260705000007_content_media.sql":   "content_media",
    "20260705000008_tech_radar.sql":      "tech_radar_entries",
    "20260705000009_youtube_videos.sql":  "youtube_videos",
    "20260705000010_extend_messages.sql": "messages",          # ALTER TABLE, same table
    "20260705000011_extend_events.sql":   "events",
    "20260705000012_admin_users.sql":     "admin_users",
}


def load_config() -> tuple[str, str, str]:
    """
    Load SUPABASE_URL, project ref, and DB password from .env / environment.
    Returns (supabase_url, project_ref, db_password).
    Exits with an error message if required values are missing.
    """
    base_dir = Path(__file__).resolve().parent
    env_file = base_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
    else:
        load_dotenv(base_dir.parent / ".env")

    supabase_url = os.getenv("SUPABASE_URL", "")
    if not supabase_url:
        print("Error: SUPABASE_URL not found in environment or .env file.", file=sys.stderr)
        sys.exit(1)

    match = re.search(r"https://([^.]+)\.supabase\.", supabase_url)
    if not match:
        print(f"Error: Could not parse project ref from SUPABASE_URL: {supabase_url}", file=sys.stderr)
        sys.exit(1)
    project_ref = match.group(1)

    db_password = os.getenv("SUPABASE_DB_PASSWORD", "")
    if not db_password:
        db_password = getpass.getpass("Enter your remote Supabase database password: ")
    if not db_password:
        print("Error: Database password is required.", file=sys.stderr)
        sys.exit(1)

    return supabase_url, project_ref, db_password


def make_connection(
    host: str,
    port: int,
    db_name: str,
    db_user: str,
    db_password: str,
) -> psycopg2.extensions.connection:
    """Open and return a psycopg2 connection. Raises on failure."""
    return psycopg2.connect(
        host=host,
        port=port,
        database=db_name,
        user=db_user,
        password=db_password,
        connect_timeout=10,
    )


def open_connection(project_ref: str, db_password: str) -> psycopg2.extensions.connection:
    """
    Try the direct Supabase host first (IPv6), then offer a pooler fallback
    for IPv4-only networks where db.[ref].supabase.co:5432 is unreachable.

    Pooler notes:
      - Port 5432  (Session mode) : username = postgres
      - Port 6543  (Transaction mode) : username = postgres.[PROJECT_REF]
    """
    db_host = f"db.{project_ref}.supabase.co"
    db_port = 5432
    db_name = "postgres"

    try:
        print(f"\nConnecting to {db_host}:{db_port} ...")
        conn = make_connection(db_host, db_port, db_name, "postgres", db_password)
        print("Successfully connected!")
        return conn
    except Exception as e:
        print(f"Direct connection failed: {e}", file=sys.stderr)

    print("\n" + "=" * 60)
    print("CONNECTION TROUBLESHOOTING (IPv6 / Pooler issue):")
    print("=" * 60)
    print("Newer Supabase projects are IPv6-only. If your network is")
    print("IPv4-only, direct connections to db.[ref].supabase.co:5432")
    print("will fail. Use the Session Pooler from:")
    print("  Supabase Dashboard > Project Settings > Database > Connection pooling")
    print("  → Choose 'Session' mode, copy the host (aws-0-*.pooler.supabase.com)")
    print("  → Port: 5432  |  User: postgres  |  Password: your DB password")
    print("=" * 60)

    use_pooler = input("\nTry connecting via a custom pooler host/port? (y/n): ").strip().lower()
    if use_pooler not in ("y", "yes"):
        sys.exit(1)

    custom_host = input("Session pooler host (e.g. aws-0-ap-southeast-1.pooler.supabase.com): ").strip()
    if not custom_host:
        print("No host provided.", file=sys.stderr)
        sys.exit(1)

    custom_port_str = input("Port [5432]: ").strip()
    custom_port = int(custom_port_str) if custom_port_str else 5432

    # Session pooler (port 5432) uses plain "postgres" username.
    # Transaction pooler (port 6543) requires "postgres.PROJECT_REF" username.
    if custom_port == 6543:
        db_user = f"postgres.{project_ref}"
        print(f"  (Transaction mode detected — using username: {db_user})")
    else:
        db_user = "postgres"

    try:
        print(f"\nConnecting to pooler {custom_host}:{custom_port} as {db_user} ...")
        conn = make_connection(custom_host, custom_port, db_name, db_user, db_password)
        print("Successfully connected via pooler!")
        return conn
    except Exception as pe:
        print(f"Pooler connection failed: {pe}", file=sys.stderr)
        sys.exit(1)


def init_migrations_table(cur: psycopg2.extensions.cursor, conn: psycopg2.extensions.connection) -> None:
    """Create the _schema_migrations tracking table if it doesn't exist."""
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS public._schema_migrations (
            version    VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ  NOT NULL DEFAULT now()
        );
        """
    )
    conn.commit()


def fetch_applied(cur: psycopg2.extensions.cursor) -> Set[str]:
    """Return the set of already-applied migration filenames."""
    cur.execute("SELECT version FROM public._schema_migrations;")
    return {row[0] for row in cur.fetchall()}


def table_exists(cur: psycopg2.extensions.cursor, table_name: str) -> bool:
    """Check whether a table exists in the public schema."""
    cur.execute(
        "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = %s);",
        (table_name,),
    )
    result = cur.fetchone()
    return bool(result and result[0])


def mark_as_applied(
    cur: psycopg2.extensions.cursor,
    applied: Set[str],
    filename: str,
) -> None:
    """Record a migration as applied (ON CONFLICT DO NOTHING = safe to call twice)."""
    cur.execute(
        "INSERT INTO public._schema_migrations (version) VALUES (%s) ON CONFLICT DO NOTHING;",
        (filename,),
    )
    applied.add(filename)


def auto_detect_existing(
    cur: psycopg2.extensions.cursor,
    conn: psycopg2.extensions.connection,
    applied: Set[str],
) -> None:
    """
    For every migration whose target table already exists in the DB but whose
    filename is not in _schema_migrations, mark it as applied automatically.

    This handles two scenarios:
      1. The DB was set up manually before the runner existed.
      2. A partial run happened and the _schema_migrations table was reset.
    """
    prepopulated: list[str] = []
    for migration, table in MIGRATION_TABLE_MAP.items():
        if migration not in applied and table_exists(cur, table):
            mark_as_applied(cur, applied, migration)
            prepopulated.append(migration)

    if prepopulated:
        conn.commit()
        print("\nDetected pre-existing tables. Marked as already applied:")
        for m in prepopulated:
            print(f"  → {m}")


def apply_migrations(
    cur: psycopg2.extensions.cursor,
    conn: psycopg2.extensions.connection,
    applied: Set[str],
    migrations_dir: Path,
) -> tuple[int, int]:
    """
    Apply all pending .sql migration files in sorted order.
    Skips files whose names start with 'seed_' (those are run manually).

    Returns:
        (applied_count, skipped_count)
    """
    migration_files = sorted(
        f for f in migrations_dir.glob("*.sql")
        if not f.name.startswith("seed_")
    )

    if not migration_files:
        print("No migration files (.sql) found in migrations/ directory.")
        return 0, 0

    print(f"\nFound {len(migration_files)} migration files. Checking status...\n")

    applied_count = 0
    skipped_count = 0

    for file_path in migration_files:
        filename = file_path.name

        if filename in applied:
            print(f"  [SKIP]   {filename}  (already applied)")
            skipped_count += 1
            continue

        print(f"  [APPLY]  {filename} ...", end="", flush=True)
        try:
            sql = file_path.read_text(encoding="utf-8").strip()
            if sql:
                cur.execute(sql)
            cur.execute(
                "INSERT INTO public._schema_migrations (version) VALUES (%s);",
                (filename,),
            )
            conn.commit()
            print(" ✓ SUCCESS")
            applied_count += 1

        except Exception as e:
            conn.rollback()
            print(" ✗ FAILED")
            print(f"\nError applying migration '{filename}':", file=sys.stderr)
            print(e, file=sys.stderr)
            print(
                "\nThe runner has stopped. Fix the error above and re-run —\n"
                "already-applied migrations are safely skipped.",
                file=sys.stderr,
            )
            raise SystemExit(1)

    return applied_count, skipped_count


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    migrations_dir = base_dir / "migrations"

    if not migrations_dir.exists():
        print(f"Error: Migrations directory not found at {migrations_dir}", file=sys.stderr)
        sys.exit(1)

    # ── Load config ──────────────────────────────────────────────────────────
    _, project_ref, db_password = load_config()

    print("=" * 60)
    print("SUPABASE POSTGRESQL MIGRATION RUNNER")
    print("=" * 60)
    print(f"Project Reference : {project_ref}")
    print(f"Database Host     : db.{project_ref}.supabase.co")
    print(f"Database Name     : postgres")
    print("=" * 60)

    # ── Connect ───────────────────────────────────────────────────────────────
    conn = open_connection(project_ref, db_password)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # ── Bootstrap tracking table ─────────────────────────────────────────
        init_migrations_table(cur, conn)

        # ── Load applied set ─────────────────────────────────────────────────
        applied = fetch_applied(cur)

        # ── Auto-detect tables from manual/partial runs ──────────────────────
        auto_detect_existing(cur, conn, applied)

        # ── Apply pending migrations ─────────────────────────────────────────
        applied_count, skipped_count = apply_migrations(cur, conn, applied, migrations_dir)

        total = applied_count + skipped_count
        print("\n" + "=" * 60)
        print("Migration run complete.")
        print(f"  Applied : {applied_count}")
        print(f"  Skipped : {skipped_count}")
        print(f"  Total   : {total}")
        print("=" * 60)

        if applied_count > 0:
            print(
                "\nNext step — seed initial data (first run only):\n"
                "  1. Open Supabase Dashboard > SQL Editor\n"
                "  2. Paste the contents of migrations/seed_data.sql\n"
                "  3. Replace all placeholder values (URLs, handles, etc.)\n"
                "  4. Click Run"
            )

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
