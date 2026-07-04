# FRONTEND PAGE-BY-PAGE CONTENT & IMPLEMENTATION GUIDE
**Version:** 1.0 | **Last Updated:** 2026-07-04
**Purpose:** Real, professional, page-level content + implementation spec for the undergraduate portfolio.
**Relationship to other docs:** This file does **not** replace `FRONTEND_REFERENCE.md`, `02_FRONTEND_ARCHITECTURE.md`, or `05_DESIGN_THEME_SYSTEM.md` — it builds directly on top of them. Folder structure, component locations, design tokens, and MDX pipeline are unchanged. This file only maps **which pages exist, what real content goes on them, and how the top navigation is organized.**

---

## 0. How This Reconciles With the Existing Architecture

The earlier docs defined **5 content lanes**: `projects`, `learn`, `stories`, `notes`, plus `about`/`contact`. Nothing about that changes. What this document adds is the **navigation grouping** on top of those lanes, because a 6–7 item flat navbar is too busy for a first-time visitor (recruiter, judge, peer) to parse in 15 seconds.

**Top navigation (upper panel), left to right:**

```
[Your Name/Logo]     Home   Projects   Tech Radar   Content ▾   Connect     [☾/☀]
                                                        ├─ Learn
                                                        ├─ Stories
                                                        └─ Notes
```

| Nav Label | Route | Maps to existing lane(s) | What changed |
|---|---|---|---|
| **Home** | `/` | — | Unchanged, now explicitly spec'd below (photo + bio) |
| **Projects** | `/projects`, `/projects/[slug]` | `projects` lane | Unchanged |
| **Tech Radar** | `/radar` | **New page** | New addition — see §4. Not a content lane; it's a curated, lightly-maintained feed, structurally simpler than the MDX lanes |
| **Content** (dropdown) | `/content` index + `/learn`, `/stories`, `/notes` | `learn` + `stories` + `notes` lanes | These three lanes are unchanged in the file system, but the navbar now groups them under one "Content" dropdown instead of three top-level items — reduces navbar clutter to 5 visible items |
| **Connect** | `/contact` | `contact` page | Renamed *label* only (`/contact` route and file stay the same, per API_CONTRACTS.md — zero backend impact) |

`/about` still exists as a route (linked from the Home page and the footer) but is no longer a top-level nav item — its content (education, skills, timeline) is partially absorbed into Home's "little description about me" section, with the full detailed version still living at `/about` for anyone who clicks through. This is a common, deliberate portfolio pattern: home gives the 10-second version, `/about` gives the 2-minute version.

**Nothing in `lib/lanes.ts`, `lib/content.ts`, the MDX frontmatter shape, or the FastAPI contact endpoint changes.** Only `components/layout/Navbar.tsx` and the new `/radar` route are additions.

---

## 1. Updated Navigation Config (Extends, Doesn't Replace, `lib/lanes.ts`)

The original `lib/lanes.ts` (from `FRONTEND_REFERENCE.md` §2) stays exactly as-is — it's still the source of truth for lane metadata used by listing pages, breadcrumbs, and tag colors. We add a **separate** file for the navbar's grouped structure so the two concerns don't tangle:

**File: `lib/navigation.ts`** (new file, sits next to `lib/lanes.ts`)

```typescript
import { lanes } from "./lanes";

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; accent: string; description: string }[];
}

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Tech Radar", href: "/radar" },
  {
    label: "Content",
    href: "/content",
    children: lanes
      .filter((l) => ["learn", "stories", "notes"].includes(l.key))
      .map((l) => ({
        label: l.label,
        href: l.href,
        accent: l.accent,
        description:
          l.key === "learn"
            ? "DSA & algorithms, companion to the YouTube series"
            : l.key === "stories"
            ? "Behind the Bit — computing history"
            : "Life, music, and informal notes",
      })),
  },
  { label: "Connect", href: "/contact" },
];
```

This keeps `lib/lanes.ts` focused on *content metadata* and `lib/navigation.ts` focused on *nav structure* — a clean separation that means adding a 6th lane later never requires touching the navbar component itself, only this config array.

---

## 2. `/` — Home Page (Full Spec)

### 2.1 Purpose

This is the 15-second page. A recruiter, a judge, or a friend's friend lands here and must immediately understand: who you are, what you do, and where to look next. Research on developer portfolios is consistent that the hero must contain a real photo (builds trust and memorability far more than an illustration or avatar), a one-line identity statement, and a clear next action — everything else is secondary.

### 2.2 Real Content (Fill In Directly)

```
PHOTO: Professional but approachable headshot. Not a passport photo,
not an overly casual selfie. Good lighting, plain or softly blurred
background, looking at camera or a natural candid. Square or 4:5 crop
works best for the hero layout below.

NAME: Vishwa [Surname]

ROLE / IDENTITY LINE (pick one, or write your own in this shape):
"CS&E Undergraduate at University of Moratuwa — building agentic AI
systems, writing DSA content, and occasionally soldering an FPGA."

SHORT BIO (2-3 sentences, sits directly under the hero):
"I'm a Computer Science & Engineering undergraduate (23 Batch,
University of Moratuwa) with a strong pull toward mathematics, machine
learning, and the history of computing. Recent work spans agentic AI
systems (FastAPI + Supabase + pgvector), FPGA-based digital design in
VHDL, and a growing library of algorithm explainers. Outside of code,
I'm into music and telling the stories behind the machines we take for
granted."

PRIMARY CTA BUTTONS:
[ View Projects ]   [ Get in Touch ]

SECONDARY LINKS (small, under CTAs or in a social row):
GitHub · LinkedIn · YouTube (DSA series) · Behind the Bit (Facebook)
```

### 2.3 Page Structure (Section by Section)

```
┌──────────────────────────────────────────────────────────┐
│  SECTION 1: Hero                                          │
│  ┌────────────┐   Vishwa [Surname]                        │
│  │            │   CS&E Undergraduate at University of     │
│  │   Photo    │   Moratuwa — building agentic AI systems, │
│  │            │   writing DSA content, and occasionally   │
│  └────────────┘   soldering an FPGA.                       │
│                                                            │
│                   [ View Projects ]  [ Get in Touch ]     │
│                   GitHub · LinkedIn · YouTube · Behind Bit │
├──────────────────────────────────────────────────────────┤
│  SECTION 2: Short bio strip (2-3 sentences, see 2.2)      │
├──────────────────────────────────────────────────────────┤
│  SECTION 3: Featured Projects (top 3, from MDX,           │
│             featured: true)                               │
│  [ Card ]   [ Card ]   [ Card ]                            │
│                                    [ See all projects → ] │
├──────────────────────────────────────────────────────────┤
│  SECTION 4: Explore lanes teaser (4 small cards)          │
│  [ Projects ] [ Learn ] [ Stories ] [ Notes ]              │
├──────────────────────────────────────────────────────────┤
│  SECTION 5: Tech Radar teaser (optional, 3 latest entries)│
│  "What I'm reading/using lately" → [ View Tech Radar → ] │
├──────────────────────────────────────────────────────────┤
│  Footer (shared component, see FRONTEND_REFERENCE.md)     │
└──────────────────────────────────────────────────────────┘
```

Section 5 (Tech Radar teaser) is **optional for v1** — only include it once `/radar` has real entries (see §4). An empty teaser is worse than no teaser.

### 2.4 Implementation

**File: `app/page.tsx`**

```typescript
import { Hero } from "@/components/home/Hero";
import { BioStrip } from "@/components/home/BioStrip";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { LaneTeasers } from "@/components/home/LaneTeasers";
import { RadarTeaser } from "@/components/home/RadarTeaser";
import { getAllContentByType, sortByDate } from "@/lib/content";
import { getLatestRadarEntries } from "@/lib/radar";

export async function generateMetadata() {
  return {
    title: "Vishwa — CS&E Undergraduate",
    description:
      "CS&E undergraduate at University of Moratuwa building agentic AI systems, DSA content, and FPGA projects.",
    openGraph: {
      title: "Vishwa — CS&E Undergraduate",
      images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    },
  };
}

export default async function HomePage() {
  const projects = await getAllContentByType("projects");
  const featured = sortByDate(projects.filter((p) => p.frontmatter.featured), "desc").slice(0, 3);
  const radarEntries = await getLatestRadarEntries(3);

  return (
    <main>
      <Hero />
      <BioStrip />
      <FeaturedProjects projects={featured} />
      <LaneTeasers />
      {radarEntries.length > 0 && <RadarTeaser entries={radarEntries} />}
    </main>
  );
}
```

**File: `components/home/Hero.tsx`**

```typescript
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Github, Linkedin, Youtube, Facebook } from "lucide-react";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-20 text-center md:flex-row md:text-left">
      <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full ring-2 ring-border md:h-48 md:w-48">
        <Image
          src="/images/profile/headshot.jpg"
          alt="Vishwa"
          fill
          sizes="192px"
          className="object-cover"
          priority
        />
      </div>

      <div>
        <h1 className="text-4xl font-bold text-foreground md:text-5xl">Vishwa</h1>
        <p className="mt-2 max-w-xl text-lg text-foreground-muted">
          CS&amp;E undergraduate at University of Moratuwa — building agentic AI
          systems, writing DSA content, and occasionally soldering an FPGA.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <Button asChild>
            <Link href="/projects">View Projects</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Get in Touch</Link>
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-foreground-muted md:justify-start">
          <a href="https://github.com/yourhandle" aria-label="GitHub"><Github className="h-5 w-5" /></a>
          <a href="https://linkedin.com/in/yourhandle" aria-label="LinkedIn"><Linkedin className="h-5 w-5" /></a>
          <a href="https://youtube.com/@yourhandle" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>
          <a href="https://facebook.com/behindthebit" aria-label="Behind the Bit on Facebook"><Facebook className="h-5 w-5" /></a>
        </div>
      </div>
    </section>
  );
}
```

**File: `components/home/BioStrip.tsx`**

```typescript
export function BioStrip() {
  return (
    <section className="border-y border-border bg-background-elevated px-4 py-10">
      <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-foreground-muted">
        I&apos;m a Computer Science &amp; Engineering undergraduate (23 Batch,
        University of Moratuwa) with a strong pull toward mathematics, machine
        learning, and the history of computing. Recent work spans agentic AI
        systems (FastAPI + Supabase + pgvector), FPGA-based digital design in
        VHDL, and a growing library of algorithm explainers. Outside of code,
        I&apos;m into music and telling the stories behind the machines we take
        for granted.
      </p>
    </section>
  );
}
```

`FeaturedProjects` and `LaneTeasers` already exist per `FRONTEND_REFERENCE.md` §1 — no changes needed there.

### 2.5 Image Requirements

- Place the real headshot at `public/images/profile/headshot.jpg`
- Minimum 800×800px source, will be served responsively via `next/image`
- Add a second crop `headshot-og.jpg` (1200×630) for use in `public/og/home.png` generation, or generate the OG image separately with the photo + name overlay
- Always keep `alt="Vishwa"` (or a slightly more descriptive alt like `"Vishwa, CS&E undergraduate"`) — never leave hero images without alt text (accessibility requirement carried over from `02_FRONTEND_ARCHITECTURE.md` §7)

---

## 3. `/projects` and `/projects/[slug]` — Projects Lane (Confirms Existing Spec)

**No structural changes** from `FRONTEND_REFERENCE.md` §4 Pattern A/B and `02_FRONTEND_ARCHITECTURE.md` §3. This section only adds the **real content plan** so the page isn't generic.

### 3.1 Real Content Plan (What Goes In `/content/projects/*.mdx`)

| Slug | Title | Featured? | Cover image needed |
|---|---|---|---|
| `agentrix-2026` | AgenTrix 2026 — Agentic Insurance Assistant | ✅ Yes | Architecture diagram or dashboard screenshot |
| `nanoprocessor-vhdl` | 4-bit Nanoprocessor — VHDL / FPGA | ✅ Yes | Basys 3 board photo or block diagram |
| `relic-ring-protocol` | Relic Ring Protocol — LAUNCH26 Hackathon | ✅ Yes | API architecture diagram or demo screenshot |
| `mst-algorithms-series` | MST Algorithm Series (Kruskal's/Prim's/Borůvka's) | Optional | Thumbnail from the YouTube series |
| `dsa-study-companion` | CS3043 Interactive Study Companion | Optional | Screenshot of the HTML tool |

Each MDX file follows the frontmatter shape already defined in `FRONTEND_REFERENCE.md` §6 (`types/content.ts`) — **unchanged**:

```mdx
---
title: "AgenTrix 2026 — Agentic Insurance Assistant"
slug: "agentrix-2026"
summary: "A multi-agent FastAPI + Supabase pgvector system built for AgenTrix 2026."
date: "2026-05-01"
tags: ["FastAPI", "Pydantic AI", "Supabase", "n8n", "Gemini Flash"]
coverImage: "/images/projects/agentrix-cover.png"
liveUrl: "https://agentrix-demo.example.com"
repoUrl: "https://github.com/yourhandle/agentrix"
featured: true
---

## The problem
[What real problem did AgenTrix solve — insurance claim triage, agent orchestration, etc.]

## Technical decisions
[Why FastAPI + Pydantic AI, why Supabase + pgvector, why n8n, why Gemini Flash — the "why" sells this more than the "what"]

## Results
[What worked, what you'd improve, hackathon outcome if applicable]
```

**Writing guidance per project (applies to all 5):**
- Open with the actual problem in 2-3 sentences, not a restatement of the title
- Name every real trade-off you made (e.g., "chose Gemini Flash over GPT-4 for latency, accepted lower reasoning depth")
- End with an honest results section — a judge or recruiter trusts "here's what I'd do differently" far more than unqualified success claims

---

## 4. `/radar` — Tech Radar (New Page, Full Spec)

### 4.1 Purpose

You said you want a page "dedicated to about news and new technologies." This is that page — a lightweight, frequently-updated feed of what you're currently reading, testing, or paying attention to in tech. It is **not** a blog (that's what `/stories` and `/notes` are for) and it is **not** a project (that's `/projects`). It's a living radar: short entries, dated, tagged, skimmable.

This deliberately uses a **simpler content model** than the MDX lanes, because radar entries are short-lived and numerous — you don't want to hand-write full MDX frontmatter for a 2-sentence note about a new library you tried.

### 4.2 Data Model

Two implementation options, pick based on how often you'll update it:

**Option A — MDX-based (consistent with other lanes, more ceremony per entry)**
Same pattern as `learn`/`stories`/`notes`: `content/radar/*.mdx`, one file per entry. Good if entries are infrequent (a few per month) and sometimes longer.

**Option B — Single JSON/YAML file (lighter, recommended for this page specifically)**
One file, many entries, no per-entry file creation ceremony. Good if you want to add a 2-sentence note in 30 seconds.

**Recommended: Option B.** Radar entries are meant to be low-friction. Reserve MDX ceremony for content that deserves a full article.

**File: `content/radar/entries.json`**

```json
[
  {
    "id": "2026-07-01-pydantic-ai-v2",
    "date": "2026-07-01",
    "title": "Pydantic AI v2 — structured multi-agent orchestration",
    "category": "framework",
    "status": "trying",
    "summary": "Testing the new agent handoff API against the AgenTrix orchestration pattern. Cleaner than manually wiring FastAPI dependency chains.",
    "link": "https://ai.pydantic.dev/"
  },
  {
    "id": "2026-06-20-supabase-branching",
    "date": "2026-06-20",
    "title": "Supabase database branching",
    "category": "infra",
    "status": "watching",
    "summary": "Per-PR database branches would remove the need for a separate staging project. Watching for GA pricing.",
    "link": "https://supabase.com/docs"
  }
]
```

**Field meanings:**
- `category`: `framework` | `infra` | `language` | `hardware` | `paper` | `tool` — extend freely, it's just a tag
- `status`: `watching` (haven't tried yet) | `trying` (actively testing) | `adopted` (using in a real project) | `dropped` (tried, moved on) — this status field is what makes the page feel like a genuine radar instead of a link dump

### 4.3 Page Structure

```
┌──────────────────────────────────────────────────────────┐
│  Tech Radar                                               │
│  Short notes on what I'm reading, testing, and adopting.  │
│                                                            │
│  Filter: [ All ] [ Trying ] [ Adopted ] [ Watching ]      │
│  Category: [ All ] [ Framework ] [ Infra ] [ Hardware ]…  │
├──────────────────────────────────────────────────────────┤
│  🟢 ADOPTED   Jul 1, 2026                                  │
│  Pydantic AI v2 — structured multi-agent orchestration     │
│  Testing the new agent handoff API against...              │
│  [framework]                                    [Link →]  │
├──────────────────────────────────────────────────────────┤
│  🟡 WATCHING   Jun 20, 2026                                │
│  Supabase database branching                                │
│  Per-PR database branches would remove...                   │
│  [infra]                                         [Link →] │
└──────────────────────────────────────────────────────────┘
```

Status color mapping (reuses existing design tokens, no new colors needed):
- `adopted` → `--accent-cyan` (confident, in-use)
- `trying` → `--accent-amber` (in progress)
- `watching` → `--fg-muted` (neutral, no color)
- `dropped` → `--accent-rose`, shown with reduced opacity/strikethrough on title

### 4.4 Implementation

**File: `lib/radar.ts`** (new file)

```typescript
import fs from "fs/promises";
import path from "path";

export interface RadarEntry {
  id: string;
  date: string;
  title: string;
  category: string;
  status: "watching" | "trying" | "adopted" | "dropped";
  summary: string;
  link?: string;
}

const RADAR_FILE = path.join(process.cwd(), "content", "radar", "entries.json");

export async function getAllRadarEntries(): Promise<RadarEntry[]> {
  const raw = await fs.readFile(RADAR_FILE, "utf-8");
  const entries: RadarEntry[] = JSON.parse(raw);
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getLatestRadarEntries(count: number): Promise<RadarEntry[]> {
  const all = await getAllRadarEntries();
  return all.slice(0, count);
}
```

**File: `app/radar/page.tsx`**

```typescript
import { getAllRadarEntries } from "@/lib/radar";
import { RadarList } from "@/components/radar/RadarList";

export async function generateMetadata() {
  return {
    title: "Tech Radar",
    description: "What I'm reading, testing, and adopting right now.",
  };
}

export default async function RadarPage() {
  const entries = await getAllRadarEntries();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold text-foreground">Tech Radar</h1>
      <p className="mt-2 text-lg text-foreground-muted">
        Short, dated notes on what I&apos;m reading, testing, and adopting. Not a
        blog — just a running log.
      </p>
      <RadarList entries={entries} />
    </main>
  );
}
```

**File: `components/radar/RadarList.tsx`** (client component — has interactive filters)

```typescript
"use client";

import { useState, useMemo } from "react";
import type { RadarEntry } from "@/lib/radar";
import { RadarCard } from "./RadarCard";

const STATUS_FILTERS = ["all", "adopted", "trying", "watching", "dropped"] as const;

export function RadarList({ entries }: { entries: RadarEntry[] }) {
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("all");

  const filtered = useMemo(
    () => (statusFilter === "all" ? entries : entries.filter((e) => e.status === statusFilter)),
    [entries, statusFilter]
  );

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-3 py-1 text-sm capitalize transition-colors ${
              statusFilter === status
                ? "bg-accent-cyan text-white"
                : "bg-background-elevated text-foreground-muted hover:text-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered.map((entry) => (
          <RadarCard key={entry.id} entry={entry} />
        ))}
        {filtered.length === 0 && (
          <p className="text-foreground-muted">No entries in this filter yet.</p>
        )}
      </div>
    </div>
  );
}
```

**File: `components/radar/RadarCard.tsx`**

```typescript
import type { RadarEntry } from "@/lib/radar";
import { ExternalLink } from "lucide-react";

const STATUS_STYLES: Record<RadarEntry["status"], string> = {
  adopted: "text-accent-cyan",
  trying: "text-accent-amber",
  watching: "text-foreground-muted",
  dropped: "text-accent-rose line-through opacity-70",
};

export function RadarCard({ entry }: { entry: RadarEntry }) {
  return (
    <article className="rounded-lg border border-border bg-background-elevated p-5">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold uppercase ${STATUS_STYLES[entry.status]}`}>
          {entry.status}
        </span>
        <time className="text-foreground-muted">{entry.date}</time>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-foreground">{entry.title}</h3>
      <p className="mt-1 text-sm text-foreground-muted">{entry.summary}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground-muted">
          {entry.category}
        </span>
        {entry.link && (
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-accent-cyan hover:underline"
          >
            Link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
```

### 4.5 Maintenance Workflow

Adding a new entry is a 30-second edit, not a new file:

```bash
# Open content/radar/entries.json, add an object to the array:
{
  "id": "2026-07-04-new-thing",
  "date": "2026-07-04",
  "title": "...",
  "category": "framework",
  "status": "trying",
  "summary": "...",
  "link": "https://..."
}
```

If this page grows past ~50 entries and JSON editing becomes unwieldy, migrate to a Supabase table (`radar_entries`) following the same pattern as `messages`/`events` in `DATABASE_REFERENCE.md` — the frontend `lib/radar.ts` interface (`RadarEntry`, `getAllRadarEntries()`) is written so that swap only touches that one file, not any component.

---

## 5. `/content`, `/learn`, `/stories`, `/notes` — Content Hub (Confirms Existing Spec + New Landing Page)

### 5.1 What's Unchanged

`/learn`, `/learn/[slug]`, `/stories`, `/stories/[slug]`, `/notes`, `/notes/[slug]` are **exactly as specified** in `FRONTEND_REFERENCE.md` §1 and §4. No route, component, or data changes.

### 5.2 What's New: `/content` Landing Page

Since the navbar now groups these three lanes under a "Content" dropdown, add a single landing page at `/content` that the dropdown's parent link points to — this gives visitors a place to land if they click "Content" itself rather than a specific child.

**File: `app/content/page.tsx`**

```typescript
import Link from "next/link";
import { lanes } from "@/lib/lanes";
import { getAllContentByType, sortByDate } from "@/lib/content";

export async function generateMetadata() {
  return {
    title: "Content",
    description: "DSA articles, computing history, and personal notes.",
  };
}

export default async function ContentHubPage() {
  const contentLanes = lanes.filter((l) => ["learn", "stories", "notes"].includes(l.key));

  const previews = await Promise.all(
    contentLanes.map(async (lane) => {
      const items = await getAllContentByType(lane.key as "learn" | "stories" | "notes");
      const latest = sortByDate(items, "desc").slice(0, 3);
      return { lane, latest };
    })
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold text-foreground">Content</h1>
      <p className="mt-2 text-lg text-foreground-muted">
        Algorithms, computing history, and the occasional life update.
      </p>

      <div className="mt-12 space-y-14">
        {previews.map(({ lane, latest }) => (
          <section key={lane.key}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold" style={{ color: lane.accent }}>
                {lane.label}
              </h2>
              <Link href={lane.href} className="text-sm text-foreground-muted hover:text-foreground">
                View all →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {latest.length === 0 ? (
                <p className="text-sm text-foreground-muted">Coming soon.</p>
              ) : (
                latest.map((item) => (
                  <Link
                    key={item.slug}
                    href={`${lane.href}/${item.slug}`}
                    className="rounded-lg border border-border p-4 transition-colors hover:border-foreground-muted"
                  >
                    <h3 className="font-medium text-foreground">{item.frontmatter.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">
                      {item.frontmatter.summary}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
```

This is purely additive — it reads from the same `lib/content.ts` and `lib/lanes.ts` already defined, no new data layer.

### 5.3 Navbar Dropdown Implementation

**File: `components/layout/Navbar.tsx`** (extends the version implied in `FRONTEND_REFERENCE.md` §1, now consuming `lib/navigation.ts`)

```typescript
"use client";

import Link from "next/link";
import { useState } from "react";
import { navigation } from "@/lib/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { ChevronDown } from "lucide-react";

export function Navbar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-foreground">
          Vishwa
        </Link>

        <ul className="flex items-center gap-6">
          {navigation.map((item) => (
            <li key={item.href} className="relative">
              {item.children ? (
                <div
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
                    {item.label} <ChevronDown className="h-3 w-3" />
                  </button>
                  {openDropdown === item.label && (
                    <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-border bg-background-elevated p-2 shadow-lg">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-background"
                        >
                          <span style={{ color: child.accent }} className="font-medium">
                            {child.label}
                          </span>
                          <p className="mt-0.5 text-xs text-foreground-muted">{child.description}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link href={item.href} className="text-sm text-foreground-muted hover:text-foreground">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <ThemeToggle />
      </nav>
    </header>
  );
}
```

Mobile nav (`components/layout/MobileNav.tsx`) follows the same `navigation` array, rendered as a flat accordion instead of a hover dropdown — implement when you reach that component, same data source, no duplication.

---

## 6. `/contact` — Connect Page (Confirms Existing Spec, Label-Only Change)

**Zero implementation changes.** The route is still `/contact`, the component is still whatever you built per `FRONTEND_REFERENCE.md` and `API_CONTRACTS.md` §1, the FastAPI endpoint is still `/api/v1/contact`. The only difference is the **visible nav label** reads "Connect" instead of "Contact" — purely a string in `lib/navigation.ts`, changeable in one line if you change your mind later.

### 6.1 Real Content for This Page

```
HEADING: Let's talk

SUBHEADING: Whether it's about a project, a collaboration, or just to
say hi — I usually reply within a day or two.

FORM: Name / Email / Message (per API_CONTRACTS.md §1)

BELOW FORM (optional but recommended):
"Prefer email? Reach me directly at you@yourdomain.com"
[ social icons row, same as Hero ]
```

---

## 7. `/about` — Still Exists, Now Explicitly the "Deep Dive"

Since Home absorbs the short bio, `/about` becomes the place for the **full** version: detailed education timeline, skills grouped by proficiency, and anything you want a recruiter to find on a second click.

### 7.1 Real Content Structure

```
1. Full bio paragraph (3-4 sentences, more detail than Home's version)

2. Education
   University of Moratuwa — B.Sc. Eng. Computer Science & Engineering
   23 Batch, [expected graduation year]
   Relevant coursework: Databases, Data Structures & Algorithms,
   Digital Design, Software Engineering, Circuits, Mathematics

3. Skills (grouped by proficiency, NOT a flat tag cloud)
   Core:        Python, TypeScript, SQL, FastAPI, Next.js
   Comfortable: VHDL, n8n, Supabase/Postgres, Pydantic AI
   Exploring:   Rust, WebGPU, [whatever you're currently learning]

4. Timeline (optional, chronological highlights)
   2026 — AgenTrix 2026, LAUNCH26 Hackathon, Fedora dual-boot migration
   2025 — CS2022/2023 DSA coursework, Nanoprocessor VHDL project
   ...

5. Resume download button
   [ Download Resume (PDF) ]
```

This page reuses the same MDX/typography patterns already defined — no new component types needed, just real content in place of placeholders.

---

## 8. Sitemap & Nav Consistency Checklist

Cross-check this against `lib/content.ts` §7 `generateSitemap()` in `FRONTEND_REFERENCE.md` — the sitemap function needs one addition for the new `/radar` route:

```typescript
// Add to generateSitemap() in lib/content.ts
{ url: "/radar", priority: 0.7 },
{ url: "/content", priority: 0.8 },
```

Everything else in that function is unchanged.

### Final Route Map (Complete, Post-Update)

```
/                    Home (photo, bio, featured projects, lane teasers)
/about               Full bio, education, skills, resume
/projects            Project grid
/projects/[slug]     Project case study
/radar               Tech Radar (NEW)
/content             Content hub landing (NEW)
/learn               DSA/algorithms index
/learn/[slug]        Algorithm article
/stories             Behind the Bit index
/stories/[slug]      Story episode
/notes               Personal notes index
/notes/[slug]        Individual note
/contact             Connect / contact form
```

---

## 9. Future-Upgrade Notes (Reliability for Later Changes)

This structure is deliberately written so that each of the following future changes touches **exactly one file**, never a cascade:

| Future change | File(s) to touch | Nothing else changes because... |
|---|---|---|
| Add a 6th content lane (e.g. "Talks") | `lib/lanes.ts` + `lib/navigation.ts` + `content/talks/*.mdx` | Navbar, content hub, and sitemap all read from these configs dynamically |
| Rename "Connect" back to "Contact" | `lib/navigation.ts` (one string) | Route, component, backend untouched |
| Move Tech Radar to a database instead of JSON | `lib/radar.ts` only | Component props (`RadarEntry[]`) unchanged, so `RadarList`/`RadarCard` need zero edits |
| Add a 4th filter to Tech Radar (e.g. by year) | `components/radar/RadarList.tsx` | Isolated to this one client component |
| Split "Content" dropdown into top-level items again | `lib/navigation.ts` (remove `children`, add 3 top-level entries) | `Navbar.tsx` already handles both flat and dropdown items conditionally |
| Change Home's featured project count from 3 to 4 | `app/page.tsx` (`.slice(0, 3)` → `.slice(0, 4)`) | `FeaturedProjects` component already maps over whatever array it receives |

This is the same principle carried over from `02_FRONTEND_ARCHITECTURE.md` §3 ("one source of truth per concern") — applied concretely to every page added in this document.
