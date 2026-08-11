#!/usr/bin/env python3
"""Render a local env file into the JSON shape expected by AWS Lambda."""

from __future__ import annotations

import json
import os
import stat
import sys
from pathlib import Path


ALLOWED_KEYS = (
    "DEBUG",
    "ALLOWED_ORIGINS",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "CONTACT_NOTIFICATION_EMAIL",
    "RATE_LIMIT_REQUESTS",
    "RATE_LIMIT_WINDOW_SECONDS",
    "SENTRY_DSN",
)

REQUIRED_KEYS = (
    "ALLOWED_ORIGINS",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CONTACT_NOTIFICATION_EMAIL",
)

PLACEHOLDER_MARKERS = (
    "replace-with",
    "your-project",
    "yourdomain.com",
    "[project-id]",
    "xxxxxxxx",
)


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").lstrip()
        if "=" not in line:
            raise ValueError(f"{path}:{line_number}: expected KEY=VALUE")

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: render_lambda_environment.py INPUT_ENV OUTPUT_JSON", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()
    if not input_path.is_file():
        print(f"Environment file not found: {input_path}", file=sys.stderr)
        return 2

    file_values = parse_env_file(input_path)
    variables = {
        key: os.environ.get(key, file_values.get(key, ""))
        for key in ALLOWED_KEYS
    }
    variables = {key: value for key, value in variables.items() if value != ""}
    variables.setdefault("DEBUG", "false")
    variables.setdefault("RATE_LIMIT_REQUESTS", "5")
    variables.setdefault("RATE_LIMIT_WINDOW_SECONDS", "3600")

    missing = [key for key in REQUIRED_KEYS if not variables.get(key)]
    if missing:
        print(f"Missing required Lambda variables: {', '.join(missing)}", file=sys.stderr)
        return 2

    placeholders = [
        key
        for key in REQUIRED_KEYS
        if any(marker in variables[key].lower() for marker in PLACEHOLDER_MARKERS)
    ]
    if placeholders:
        print(
            f"Replace placeholder values for: {', '.join(placeholders)}",
            file=sys.stderr,
        )
        return 2

    payload = {"Variables": variables}
    encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    if len(encoded) > 3800:
        print(
            f"Lambda environment JSON is {len(encoded)} bytes; keep it below the 4 KB quota.",
            file=sys.stderr,
        )
        return 2


    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(encoded)
    output_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    print(f"Rendered {len(variables)} Lambda environment variables to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
