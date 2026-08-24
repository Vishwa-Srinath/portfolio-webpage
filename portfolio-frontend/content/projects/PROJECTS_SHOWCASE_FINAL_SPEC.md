# PROJECTS SHOWCASE — FINAL BUILD SPEC
**Version:** 2.0 (Final) | **Last Updated:** 2026-08-24
**Audience:** Coding agent implementing this against the existing Next.js + FastAPI + Supabase portfolio codebase.
**Scope:** Replace the current `ProjectCard.tsx` / `ProjectGallery.tsx` / `/projects` / `/projects/[slug]` implementation with the spec below. Nothing outside the Projects lane changes — same nav, same other four lanes (`learn`, `stories`, `notes`, `about`), same deployment setup.
**Assumption:** Full project content (tech stacks, architecture diagrams, screenshots, write-ups) already exists and is ready to be dropped into the frontmatter shape defined in §2. This spec is implementation-only — no placeholder content should ship.

---

## 0. Read This First (Agent Instructions)

1. Do not introduce new dependencies unless explicitly named below (`lucide-react` is already in the stack; nothing else is required — the lightbox, accordion, and stats widgets are hand-built, not library-sourced).
2. Every color, radius, spacing, and shadow value MUST come from the existing CSS variables defined in the design theme system (`--bg`, `--bg-elevated`, `--fg`, `--fg-muted`, `--border`, `--accent-cyan`, and sibling `--accent-*` tokens). Do not hardcode hex values anywhere in this spec's components.
3. Work through §9 (Implementation Order) top to bottom. Each phase is independently shippable — do not start a later phase until the current one passes its acceptance criteria.
4. If a design decision in this doc conflicts with `05_DESIGN_THEME_SYSTEM.md`, the theme system wins — this doc styles content, it does not redefine tokens.

---

## 1. Design Tokens Recap (In Scope for This Feature)

Pulled from the existing components — reuse exactly these, do not invent new ones without a reason:

| Token | Current usage | Use in this spec |
|---|---|---|
| `--bg` | Page background | Lightbox backdrop base, screenshot browser-chrome bar |
| `--bg-elevated` | Card surface | Cards, chips background, accordion panel |
| `--fg` | Primary text | Titles, active states |
| `--fg-muted` | Secondary text | Summaries, captions, stats |
| `--border` | 1px borders | Card borders, chip borders, diagram frame |
| `--accent-cyan` | Primary accent (links, hover) | Kept as the *default* accent — do not replace with new colors for primary actions |
| `--accent-{purple,green,blue,orange,pink}` | Assumed present per theme system's multi-lane color coding | Tech-stack chip categories (§4.2) — confirm these five exist before implementing; if the theme system only defines a subset, degrade gracefully to `--fg-muted` for unmapped categories rather than inventing new hex values |

If any `--accent-*` beyond cyan does not exist in the current token set, add it to the theme system file first (one line each), following whatever naming/lightness convention the existing tokens use — do not hardcode a substitute inline.

---

## 2. Content Model — Final Frontmatter Shape

This is the authoritative shape. Extend `ContentItem` in `lib/content.ts` to match exactly.

```typescript
// lib/content.ts — extend existing types, do not replace

export interface TechStackItem {
  name: string;
  category: "ai" | "backend" | "database" | "frontend" | "infra" | "hardware";
  note?: string; // optional one-line "why I used this" — powers chip tooltip
}

export interface ProjectChallenge {
  title: string;
  detail: string;
}

export interface ProjectDocument {
  title: string;
  url: string;
  description?: string;
  provider?: string;
}

export interface ProjectImage {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  layout?: "half" | "portrait" | "wide";
  type?: "image" | "video";
  kind?: "screenshot" | "diagram";
}

export interface ProjectFrontmatter {
  // existing fields — unchanged
  title: string;
  slug: string;
  summary: string;
  date: string;
  tags: string[];
  repoUrl?: string;

  // new fields
  status: "shipped" | "in-progress" | "archived";
  featured: boolean;
  role: string;
  timeframe: string;
  coverImage: string;
  coverVideo?: string;
  techStack: TechStackItem[];
  liveUrl?: string;
  demoVideoUrl?: string;
  problem: string;
  approach: string;
  challenges: ProjectChallenge[];
  results: string[];
  architectureDiagram?: string;
  documentation?: ProjectDocument[];
}
```

MDX file example (`content/projects/agentrix.mdx`):

```yaml
---
title: "AgenTrix — Multi-Agent Workflow Orchestrator"
slug: "agentrix"
summary: "An agentic AI system that plans, executes, and self-corrects multi-step workflows."
date: "2026-06-15"
status: "shipped"
featured: true
role: "Solo builder"
timeframe: "3 weeks"
coverImage: "/projects/agentrix/cover.png"
tags: ["AI Agents", "FastAPI", "Supabase", "pgvector"]
techStack:
  - { name: "FastAPI", category: "backend" }
  - { name: "Pydantic AI", category: "ai", note: "Structured tool-calling with typed outputs" }
  - { name: "Supabase", category: "database" }
  - { name: "pgvector", category: "database", note: "Long-term memory across workflow runs" }
  - { name: "Next.js", category: "frontend" }
  - { name: "n8n", category: "infra" }
repoUrl: "https://github.com/vishwa/agentrix"
liveUrl: "https://agentrix.vercel.app"
problem: "Manual multi-step workflows required constant human handoff with no shared memory between steps."
approach: "Built a planner-executor agent loop on FastAPI, using Pydantic AI for structured tool-calling and pgvector for cross-run memory."
challenges:
  - title: "Agent losing context across long workflows"
    detail: "Chunked intermediate results into pgvector with a run_id namespace, retrieved via similarity search per step instead of full-history prompting."
  - title: "LLM provider rate limits during live demo"
    detail: "Added a fallback queue with exponential backoff and cached partial results so a retry didn't restart the whole run."
results:
  - "Cut manual handoff steps from 6 to 1"
  - "Placed top-8 at AgenTrix 2026 (40+ teams)"
  - "Reused as the base stack for this portfolio's backend"
architectureDiagram: "/projects/agentrix/architecture.svg"
documentation:
  - title: "System design report"
    url: "https://drive.google.com/file/d/FILE_ID/view"
    provider: "Google Drive"
---

<!-- optional deeper MDX write-up body goes here, rendered below the Results section -->
```

---

## 3. `/projects` — Final Listing Page Spec

### 3.1 Structure

```
Projects
A collection of things I've built.

[ Search input ]           [All] [AI] [Backend] [Database] [Frontend] [Hardware]

── Featured ──────────────────────────────────────────
[ Featured Card ]  [ Featured Card ]  [ Featured Card ]

── All Projects (N) ──────────────────────────────────
[ Card ] [ Card ] [ Card ]
[ Card ] [ Card ] [ Card ]
```

### 3.2 Behavior — Precise Spec

| Interaction | Behavior |
|---|---|
| Typing in search | Filters against `title`, `summary`, `tags` (case-insensitive substring), debounced 150ms, updates a URL query param `?q=` so the state survives refresh/share |
| Clicking a category chip | Filters `techStack[].category`; chips are single-select for v1 (not multi-select — keep simple); "All" resets |
| Search + filter combined | AND logic — both apply together |
| Empty result state | Show a plain message + "Clear filters" button — never show an empty grid with no explanation |
| Grid reflow on filter change | Items animate position over ~200ms via CSS `transition-all`; do not fade the whole grid to blank and back — that reads as a loading state, not a filter |
| Featured row | Only renders if at least 1 project has `featured: true`; if zero, section is omitted entirely (never shows an empty "Featured" header) |

### 3.3 `FeaturedProjectCard` vs `ProjectCard`

Featured variant is the same component with `variant="featured"` (§4.1) — larger cover image aspect ratio (`aspect-[16/9]` instead of `[16/10]`), summary shown at 3 lines instead of 2 (`line-clamp-3`), otherwise identical DOM shape. Do not build a second component — one component, one prop, two visual states. This keeps the "one source of truth per concern" principle from the rest of the docs.

---

## 4. Case-Study Page — Final Spec (`/projects/[slug]`)

### 4.1 Full Section Order (Final)

1. Breadcrumb (`← Back to projects`)
2. Header: title, status badge, role · timeframe · date
3. Cover media (image or looping video, full-width, `aspect-[21/9]`)
4. Action row: GitHub / Live demo buttons + live stats (stars, forks, last commit) via `ProjectStats`
5. **The Problem** — `problem` field, rendered as a single lead paragraph (larger font, `text-lg`)
6. **The Approach** — `approach` field + tech stack chips grouped by category with subheadings ("AI", "Backend", "Database"...)
7. **Architecture** — `ArchitectureDiagram` component (only rendered if `architectureDiagram` is set)
8. **Product & Architecture** gallery — existing `ProjectGallery`, now lightbox-enabled
9. **Challenges** — `ChallengeAccordion`, collapsed by default (only rendered if `challenges.length > 0`)
10. **Results** — checklist-style list, one line each, using a checkmark icon from `lucide-react`
11. **Project documentation** — linked supporting documents (only rendered if `documentation` is set)
12. Optional full MDX write-up body (rendered below Results, using existing MDX/typography styles — no new prose styling needed)
13. Prev/Next project navigation + related-tag chips (existing pattern, unchanged)

**Conditional rendering rule:** every section beyond #1–#6 is optional and MUST be omitted (not shown empty/placeholder) if its underlying frontmatter field is absent. A project with no diagram simply has no Architecture section — never render an empty state for optional sections on a public page.

### 4.2 `generateMetadata` for SEO/social

```typescript
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const project = await getProjectBySlug(params.slug);
  return {
    title: `${project.frontmatter.title} — Vishwa`,
    description: project.frontmatter.summary,
    openGraph: {
      title: project.frontmatter.title,
      description: project.frontmatter.summary,
      images: [{ url: project.frontmatter.coverImage, width: 1200, height: 630 }],
    },
  };
}
```

---

## 5. Components — Final Code

### 5.1 `ProjectCard.tsx` (replaces existing file in full)

```tsx
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ContentItem } from "@/lib/content";
import { TechStackChip } from "./TechStackChip";
import { ProjectStats } from "./ProjectStats";

interface Props {
  project: ContentItem;
  variant?: "default" | "featured";
}

const statusLabel: Record<string, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  archived: "Archived",
};

export function ProjectCard({ project, variant = "default" }: Props) {
  const { frontmatter, slug } = project;
  const isFeatured = variant === "featured";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)]
      bg-[var(--bg-elevated)] transition-all duration-200 hover:-translate-y-1
      hover:border-[var(--accent-cyan)]/40 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/5">

      {frontmatter.coverImage && (
        <Link
          href={`/projects/${slug}`}
          className={`relative block overflow-hidden ${isFeatured ? "aspect-[16/9]" : "aspect-[16/10]"}`}
        >
          <Image
            src={frontmatter.coverImage}
            alt={frontmatter.title}
            fill
            sizes={isFeatured ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 767px) 100vw, 33vw"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {frontmatter.status && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60
              px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {frontmatter.status === "shipped" && <CheckCircle2 className="h-3 w-3" />}
              {statusLabel[frontmatter.status]}
            </span>
          )}
        </Link>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-base font-semibold">
          <Link href={`/projects/${slug}`} className="text-[var(--fg)] transition-colors group-hover:text-[var(--accent-cyan)]">
            {frontmatter.title}
          </Link>
        </h2>
        <p className={`mt-2 text-sm leading-relaxed text-[var(--fg-muted)] ${isFeatured ? "line-clamp-3" : "line-clamp-2"}`}>
          {frontmatter.summary}
        </p>

        {frontmatter.techStack?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {frontmatter.techStack.slice(0, 4).map((t) => (
              <TechStackChip key={t.name} tech={t} />
            ))}
            {frontmatter.techStack.length > 4 && (
              <span className="rounded-full px-2 py-0.5 text-xs text-[var(--fg-muted)]">
                +{frontmatter.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <ProjectStats slug={slug} />
          <Link href={`/projects/${slug}`} className="text-xs font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]">
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
```

### 5.2 `TechStackChip.tsx` (new)

```tsx
const categoryColor: Record<string, string> = {
  ai: "var(--accent-purple)",
  backend: "var(--accent-green)",
  database: "var(--accent-blue)",
  frontend: "var(--accent-cyan)",
  infra: "var(--accent-orange)",
  hardware: "var(--accent-pink)",
};

interface Props {
  tech: { name: string; category: string; note?: string };
}

export function TechStackChip({ tech }: Props) {
  const color = categoryColor[tech.category] ?? "var(--fg-muted)";
  return (
    <span
      title={tech.note}
      className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}12`, color }}
    >
      {tech.name}
    </span>
  );
}
```

### 5.3 `ProjectStats.tsx` (new)

```tsx
"use client";
import { useEffect, useState } from "react";
import { Star, GitFork } from "lucide-react";

interface Stats { stars: number; forks: number }

export function ProjectStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/projects/${slug}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  if (!stats) return <span />; // reserve layout space, render nothing rather than a spinner

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{stats.stars}</span>
      <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{stats.forks}</span>
    </div>
  );
}
```

### 5.4 `ProjectLightbox.tsx` (new — shared by Gallery and Architecture Diagram)

```tsx
"use client";
import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface LightboxItem { src: string; alt: string; caption?: string }

interface Props {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ProjectLightbox({ items, index, onClose, onNavigate }: Props) {
  const current = items[index];

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && index < items.length - 1) onNavigate(index + 1);
    if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
  }, [index, items.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2 hover:text-[var(--accent-cyan)]"
      >
        <X className="h-5 w-5" />
      </button>

      {index > 0 && (
        <button
          aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          className="absolute left-4 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2 hover:text-[var(--accent-cyan)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          aria-label="Next"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          className="absolute right-4 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-2 hover:text-[var(--accent-cyan)]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={current.src}
          alt={current.alt}
          width={1400}
          height={900}
          className="h-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
        />
        {current.caption && (
          <p className="mt-3 text-center text-sm text-[var(--fg-muted)]">{current.caption}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
```

### 5.5 `ProjectGallery.tsx` — Final Update (integrates lightbox, keeps existing grid logic)

Keep the existing `layoutClasses` map and grid structure exactly as-is. Add local state for the open index, wrap each figure in a button, add the "screenshot" browser-chrome frame:

```tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import type { ProjectImage } from "@/lib/content";
import { ProjectLightbox } from "./ProjectLightbox";

interface Props { images: ProjectImage[] }

const layoutClasses: Record<NonNullable<ProjectImage["layout"]>, string> = {
  half: "md:col-span-3",
  portrait: "md:col-span-3",
  wide: "md:col-span-6",
};

export function ProjectGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="project-gallery-heading" className="mb-12">
      <div className="mb-5">
        <h2 id="project-gallery-heading" className="text-xl font-bold text-[var(--fg)]">
          Product &amp; architecture
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Selected screens and technical design work from the project.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        {images.map((image, i) => (
          <figure key={image.src} className={layoutClasses[image.layout ?? "wide"]}>
            <button
              onClick={() => setOpenIndex(i)}
              className="block w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-left"
            >
              {image.kind === "screenshot" && (
                <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--fg-muted)]/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--fg-muted)]/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--fg-muted)]/30" />
                </div>
              )}
              <div className={image.layout === "portrait" ? "flex items-center justify-center p-3" : ""}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes={
                    image.layout === "half" || image.layout === "portrait"
                      ? "(max-width: 767px) 100vw, 50vw"
                      : "(max-width: 767px) 100vw, 768px"
                  }
                  className={
                    image.layout === "portrait"
                      ? "mx-auto h-auto max-h-[34rem] w-auto max-w-full object-contain"
                      : "h-auto w-full object-contain"
                  }
                />
              </div>
            </button>
            <figcaption className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      {openIndex !== null && (
        <ProjectLightbox
          items={images.map((img) => ({ src: img.src, alt: img.alt, caption: img.caption }))}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </section>
  );
}
```

### 5.6 `ArchitectureDiagram.tsx` (new)

```tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { ProjectLightbox } from "./ProjectLightbox";

export function ArchitectureDiagram({ src, title }: { src: string; title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold text-[var(--fg)]">Architecture</h2>
      <button
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
      >
        <Image src={src} alt={`${title} architecture diagram`} width={1200} height={700} className="h-auto w-full object-contain" />
        <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-[var(--border)]
          bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" /> Expand
        </span>
      </button>

      {open && (
        <ProjectLightbox
          items={[{ src, alt: `${title} architecture diagram` }]}
          index={0}
          onClose={() => setOpen(false)}
          onNavigate={() => {}}
        />
      )}
    </section>
  );
}
```

### 5.7 `ChallengeAccordion.tsx` (new — dependency-free)

```tsx
import type { ProjectChallenge } from "@/lib/content";

export function ChallengeAccordion({ challenges }: { challenges: ProjectChallenge[] }) {
  if (!challenges?.length) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold text-[var(--fg)]">Challenges</h2>
      <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        {challenges.map((c) => (
          <details key={c.title} className="group px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-[var(--fg)] marker:hidden">
              <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
              {c.title}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-relaxed text-[var(--fg-muted)]">{c.detail}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

### 5.8 `ResultsList.tsx` (new — small, inline is also fine if you prefer not to add a file)

```tsx
import { CheckCircle2 } from "lucide-react";

export function ResultsList({ results }: { results: string[] }) {
  if (!results?.length) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold text-[var(--fg)]">Results</h2>
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm text-[var(--fg)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-cyan)]" />
            {r}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

---

## 6. Backend — Final Spec

### 6.1 Schema (Supabase migration)

```sql
create table if not exists project_stats (
  slug text primary key,
  repo_url text not null,
  stars int not null default 0,
  forks int not null default 0,
  last_commit_at timestamptz,
  language text,
  fetched_at timestamptz not null default now()
);

create table if not exists project_views (
  slug text primary key,
  view_count bigint not null default 0
);
```

### 6.2 FastAPI router (`app/routers/projects.py`)

```python
from fastapi import APIRouter, HTTPException
from app.db import supabase
from app.services.github_sync import refresh_project_stats

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])

@router.get("/{slug}/stats")
async def get_stats(slug: str):
    result = supabase.table("project_stats").select("*").eq("slug", slug).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No stats cached for this project")
    return {
        "stars": result.data["stars"],
        "forks": result.data["forks"],
        "lastCommit": result.data["last_commit_at"],
    }

@router.post("/{slug}/view")
async def increment_view(slug: str):
    supabase.rpc("increment_view_count", {"project_slug": slug}).execute()
    return {"ok": True}

@router.get("/stats/refresh")
async def refresh_all_stats(x_cron_secret: str | None = None):
    # Guard with a shared secret header set by the n8n scheduled workflow —
    # never expose this endpoint unauthenticated.
    if x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    await refresh_project_stats()
    return {"ok": True}
```

`increment_view_count` as a Postgres function (atomic upsert, avoids a race on concurrent visits):

```sql
create or replace function increment_view_count(project_slug text)
returns void as $$
  insert into project_views (slug, view_count)
  values (project_slug, 1)
  on conflict (slug) do update set view_count = project_views.view_count + 1;
$$ language sql;
```

### 6.3 Scheduled refresh (n8n)

- Trigger: Schedule node, every 6–12 hours.
- HTTP node → `GET {backend_url}/api/v1/projects/stats/refresh` with header `X-Cron-Secret: {secret}`.
- No retry storm needed — GitHub API failures on one refresh just mean slightly stale stats until the next run, never a broken page (stats section renders `null`/hidden on fetch failure per `ProjectStats.tsx` above).

---

## 7. Responsive Behavior

| Breakpoint | Listing grid | Card cover aspect | Gallery grid |
|---|---|---|---|
| Mobile (<768px) | 1 column | `16/10` unchanged | 1 column (all `layoutClasses` collapse to full width — already true via existing `md:col-span-*`) |
| Tablet (768–1024px) | 2 columns | unchanged | 2-up for `half`/`portrait`, full for `wide` |
| Desktop (>1024px) | 3 columns | unchanged | as designed in `layoutClasses` |

Lightbox on mobile: swap the side arrow buttons for swipe gesture support only if time allows — tap-to-close and on-screen arrow buttons are sufficient for v1 and already satisfy the acceptance criteria below.

---

## 8. Accessibility Checklist

- [ ] Lightbox: `role="dialog"`, `aria-modal="true"`, focus moves to close button on open, `Escape` closes, focus returns to the triggering thumbnail on close.
- [ ] All interactive images (gallery thumbnails, architecture diagram) are real `<button>` elements, not `<div onClick>`.
- [ ] Status badge and stats icons are decorative + labeled — icon-only stats (`ProjectStats`) should have an `aria-label` on the container (e.g. `aria-label="24 GitHub stars, 6 forks"`) since the visual is icon+number only.
- [ ] `ChallengeAccordion` uses native `<details>/<summary>` — accessible by default, no extra ARIA needed.
- [ ] Every `<Image>` has meaningful `alt` text sourced from frontmatter, never empty or filename-derived.
- [ ] Color is never the only signal — status badge has both an icon (shipped = checkmark) and text, not color alone.

---

## 9. Implementation Order (Final)

| Phase | Work | Depends on | Ships independently? |
|---|---|---|---|
| 1 | Extend types in `lib/content.ts` (§2) | — | Yes — unblocks everything, no visible change alone |
| 2 | `TechStackChip` + updated `ProjectCard` (§5.1–5.2) | Phase 1 | Yes — visible lift on `/projects` immediately |
| 3 | `ProjectLightbox` + updated `ProjectGallery` (§5.4–5.5) | Phase 1 | Yes — visible lift on existing case-study pages |
| 4 | Case-study page restructure (§4.1), `ArchitectureDiagram`, `ChallengeAccordion`, `ResultsList` (§5.6–5.8) | Phases 1–3 | Yes |
| 5 | Migrate 3–4 flagship projects to full frontmatter (§8 checklist from v1 doc still applies) | Phase 4 | Yes — do this before touching all projects |
| 6 | `/projects` listing search + filter (§3.2) | Phase 2 | Yes, independent of backend work |
| 7 | Backend: schema, router, `ProjectStats` wiring (§6.1–6.2) | Phase 2 (card needs the component present) | Yes — card/page work fine with `ProjectStats` returning nothing until this ships |
| 8 | n8n scheduled refresh (§6.3) | Phase 7 | Final step — nothing depends on it |

**Definition of done for the whole feature:** all 8 phases complete, accessibility checklist (§8 above) passed, at least 3 flagship projects fully migrated to the new frontmatter shape with real diagrams and screenshots, no hardcoded colors outside the token table in §1, and `/projects` search/filter state survives a page refresh via URL query param.
