# FRONTEND ARCHITECTURE REFERENCE
**Version:** 1.0 | **Last Updated:** 2026-06-21  
**Purpose:** Live coding reference — copy patterns, adapt, stay on structure

---

## 1. Folder Structure (Copy-Paste Ready)

```
portfolio-frontend/
├── app/
│   ├── (auth)/                    # Route group for future admin (v2+)
│   │   └── login/
│   │       └── page.tsx
│   ├── (content)/                 # Route group for all content lanes
│   │   ├── learn/
│   │   │   ├── layout.tsx         # Shared Learn layout (accent color, sidebar)
│   │   │   ├── page.tsx           # /learn index
│   │   │   └── [slug]/
│   │   │       └── page.tsx       # /learn/[slug]
│   │   ├── stories/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── notes/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── projects/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       └── [slug]/page.tsx
│   ├── (marketing)/               # Route group for static pages
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home (/)
│   ├── sitemap.ts
│   ├── robots.ts
│   └── globals.css                # Tailwind + CSS variables
├── content/                       # ALL content source (NEVER touch from code)
│   ├── projects/
│   │   ├── agentrix-2026.mdx
│   │   ├── nanoprocessor-vhdl.mdx
│   │   └── _metadata.json         # Optional: fallback metadata if frontmatter parsing fails
│   ├── learn/
│   │   ├── kruskals-mst.mdx
│   │   ├── prims-mst.mdx
│   │   └── dijkstra-shortest-path.mdx
│   ├── stories/
│   │   ├── ep01-first-bug.mdx
│   │   └── ep02-grace-hopper.mdx
│   └── notes/
│       ├── music-june-2026.mdx
│       └── dual-boot-journey.mdx
├── components/
│   ├── ui/                        # shadcn/ui auto-generated (DO NOT HAND-EDIT except to add custom styling)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── form.tsx               # react-hook-form integration
│   │   └── [others from shadcn]
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── Sidebar.tsx            # For /learn, /stories, /notes (optional, mobile-hidden)
│   │   └── MobileNav.tsx
│   ├── home/
│   │   ├── Hero.tsx               # Name, role, CTA buttons
│   │   ├── FeaturedProjects.tsx   # Top 3 projects grid
│   │   ├── LaneTeasers.tsx        # 4 small cards linking to Learn/Stories/Notes
│   │   └── Newsletter.tsx         # Optional, v1.5
│   ├── projects/
│   │   ├── ProjectCard.tsx        # Reusable card (cover, title, summary, tags, links)
│   │   ├── TechBadge.tsx          # Single tech tag with lane accent
│   │   ├── ProjectGrid.tsx        # Grid wrapper with responsive layout
│   │   └── CaseStudyLayout.tsx    # Shell for /projects/[slug], /learn/[slug], etc.
│   ├── content/
│   │   ├── ArticleIndex.tsx       # Reusable list layout for /learn, /stories, /notes
│   │   ├── ArticleCard.tsx        # Card for article in a list
│   │   └── Breadcrumbs.tsx        # Semantic nav trail
│   ├── mdx/                       # Custom MDX components (embedded in .mdx files)
│   │   ├── CodeBlock.tsx          # With language label, copy button, shiki highlight
│   │   ├── Callout.tsx            # note | warning | tip | success
│   │   ├── Image.tsx              # Wraps next/image with caption support
│   │   ├── Link.tsx               # External link icon + color
│   │   ├── Heading.tsx            # Auto anchor links (h2–h6)
│   │   ├── Table.tsx              # Responsive table wrapper
│   │   ├── AlgoVisualizer.tsx     # Embedded algorithm step-through (dynamic, lazy)
│   │   └── MathBlock.tsx          # KaTeX render (for MA1024-style content)
│   └── shared/
│       ├── Seo.tsx                # Sets <meta> tags (wrapper around next/head)
│       ├── JsonLd.tsx             # Renders <script type="application/ld+json">
│       ├── SkipToContent.tsx      # Accessibility: jump to #main
│       └── ClientOnly.tsx         # Suspense boundary for dynamic imports
├── lib/
│   ├── content.ts                 # Parse MDX from /content, build metadata indexes
│   ├── lanes.ts                   # Lane config: key, label, accent color, icon
│   ├── supabase.ts                # Supabase client (server + client variants)
│   ├── supabase-admin.ts          # Service-role client (server-side only, never export)
│   ├── api.ts                     # Typed fetch wrapper for FastAPI backend
│   ├── seo.ts                     # generateMetadata() helpers
│   ├── cn.ts                      # clsx + tailwind-merge (class name utility)
│   ├── types.ts                   # Shared types (re-export from /types)
│   └── cache.ts                   # Next.js cache helpers (revalidatePath, etc.)
├── types/
│   ├── content.ts                 # Project, Article, Story, Note frontmatter shapes
│   ├── supabase.ts                # Supabase schema types (generated via Supabase CLI)
│   └── api.ts                     # Request/response shapes from FastAPI
├── public/
│   ├── images/
│   │   ├── projects/
│   │   │   ├── agentrix-cover.png
│   │   │   └── nanoprocessor-cover.png
│   │   ├── stories/
│   │   ├── og/                    # Open Graph images, one per page
│   │   │   ├── home.png
│   │   │   └── projects.png
│   │   └── favicons/
│   ├── fonts/
│   │   └── (empty, fonts loaded via next/font from Google)
│   ├── resume.pdf
│   └── robots.txt (generated at build time)
├── hooks/
│   ├── useContentsByLane.ts       # Read all articles for a lane
│   ├── useTheme.ts                # Access next-themes (reuse next-themes hook)
│   └── useScrollPosition.ts       # For progress bar, scroll-to-top button
├── styles/
│   └── (empty if using Tailwind exclusively)
├── .env.example
├── .env.local (git-ignored)
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.ts              # For Tailwind/autoprefixer
├── package.json
└── pnpm-lock.yaml (or package-lock.json)
```

## 2. Tailwind Config (Exact Pattern)

**File: `tailwind.config.ts`**
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme
        background: "var(--bg)",
        "background-elevated": "var(--bg-elevated)",
        foreground: "var(--fg)",
        "foreground-muted": "var(--fg-muted)",
        border: "var(--border)",
        
        // Lane accents
        "accent-cyan": "var(--accent-cyan)",
        "accent-violet": "var(--accent-violet)",
        "accent-amber": "var(--accent-amber)",
        "accent-rose": "var(--accent-rose)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "var(--fg)",
            "--tw-prose-headings": "var(--fg)",
            "--tw-prose-lead": "var(--fg-muted)",
            "--tw-prose-links": "var(--accent-cyan)",
            "--tw-prose-bold": "var(--fg)",
            "--tw-prose-counters": "var(--fg-muted)",
            "--tw-prose-bullets": "var(--border)",
            "--tw-prose-hr": "var(--border)",
            "--tw-prose-quotes": "var(--fg-muted)",
            "--tw-prose-quote-borders": "var(--border)",
            "--tw-prose-captions": "var(--fg-muted)",
            "--tw-prose-code": "var(--fg)",
            "--tw-prose-pre-bg": "var(--bg-elevated)",
            "--tw-prose-pre-code": "var(--fg)",
            "--tw-prose-th-borders": "var(--border)",
            "--tw-prose-td-borders": "var(--border)",
            maxWidth: "65ch",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
} satisfies Config;
```

## 3. Global CSS & Design Tokens

**File: `app/globals.css`**
```css
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

/* Typography imports */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}

@font-face {
  font-family: "JetBrains Mono";
  src: url("/fonts/jetbrains-mono-variable.woff2") format("woff2");
  font-weight: 100 700;
  font-display: swap;
}

/* Design tokens — light theme (default) */
:root {
  /* Backgrounds */
  --bg: #ffffff;
  --bg-elevated: #f5f5f7;
  
  /* Foreground / text */
  --fg: #16181d;
  --fg-muted: #5a5f6a;
  
  /* Borders & dividers */
  --border: #e3e5e8;
  
  /* Accents per lane */
  --accent-cyan: #0891b2;     /* Projects */
  --accent-violet: #7c3aed;   /* Learn */
  --accent-amber: #d97706;    /* Stories */
  --accent-rose: #e11d48;     /* Notes */
  
  /* Type scale (use in components via rem) */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: clamp(1.25rem, 1rem + 1vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --text-3xl: clamp(2rem, 1.5rem + 2.5vw, 3rem);
  --text-4xl: clamp(2.5rem, 2rem + 3.5vw, 4rem);
  
  /* Font families */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  
  /* Animations */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark theme */
.dark {
  --bg: #0b0d10;
  --bg-elevated: #14171c;
  --fg: #e8eaed;
  --fg-muted: #9aa0aa;
  --border: #232730;
  
  --accent-cyan: #22d3ee;
  --accent-violet: #a78bfa;
  --accent-amber: #fbbf24;
  --accent-rose: #fb7185;
}

/* Base styles */
html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg);
  color: var(--fg);
  transition: background-color var(--transition-base),
              color var(--transition-base);
}

/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Scrollbar styling (webkit browsers) */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--bg);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--fg-muted);
}
```

## 4. Key Component Patterns

### Pattern A: Server Component Reading Content

**File: `app/projects/page.tsx`** (static, renders at build time)
```typescript
import { getAllContentByType, sortByDate } from "@/lib/content";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Full-stack systems, agentic AI, FPGA work.",
  openGraph: {
    title: "Projects",
    url: "/projects",
    images: [{ url: "/og/projects.png", width: 1200, height: 630 }],
  },
};

export default async function ProjectsPage() {
  const allProjects = await getAllContentByType("projects");
  const sorted = sortByDate(allProjects, "desc");

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Projects</h1>
        <p className="mb-12 text-lg text-foreground-muted">
          Full-stack builds, competitive code, and FPGA experiments.
        </p>
        <ProjectGrid projects={sorted} />
      </div>
    </main>
  );
}
```

### Pattern B: Dynamic Route with MDX Rendering

**File: `app/projects/[slug]/page.tsx`**
```typescript
import { getAllContentByType, getContentBySlug } from "@/lib/content";
import { MDXContent } from "@/components/mdx/MDXContent";
import { CaseStudyLayout } from "@/components/projects/CaseStudyLayout";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const projects = await getAllContentByType("projects");
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const project = await getContentBySlug("projects", params.slug);
  if (!project) return notFound();

  return {
    title: `${project.frontmatter.title} — Projects`,
    description: project.frontmatter.summary,
    openGraph: {
      title: project.frontmatter.title,
      description: project.frontmatter.summary,
      images: [{ url: project.frontmatter.coverImage }],
    },
  };
}

export default async function ProjectPage({ params }: { params: { slug: string } }) {
  const project = await getContentBySlug("projects", params.slug);
  if (!project) return notFound();

  return (
    <CaseStudyLayout
      title={project.frontmatter.title}
      date={project.frontmatter.date}
      tags={project.frontmatter.tags}
      coverImage={project.frontmatter.coverImage}
      liveUrl={project.frontmatter.liveUrl}
      repoUrl={project.frontmatter.repoUrl}
    >
      <MDXContent code={project.content} />
    </CaseStudyLayout>
  );
}
```

### Pattern C: Content Library (lib/content.ts)

**File: `lib/content.ts`** (build-time only, can be slow)
```typescript
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export interface ContentFrontmatter {
  title: string;
  slug: string;
  summary: string;
  date: string;
  tags: string[];
  coverImage?: string;
  liveUrl?: string;
  repoUrl?: string;
  featured?: boolean;
}

export interface ContentItem {
  slug: string;
  frontmatter: ContentFrontmatter;
  content: string; // Raw MDX
}

const CONTENT_DIR = path.join(process.cwd(), "content");

export async function getAllContentByType(type: "projects" | "learn" | "stories" | "notes"): Promise<ContentItem[]> {
  const dir = path.join(CONTENT_DIR, type);
  const files = await fs.readdir(dir);

  const items = await Promise.all(
    files
      .filter((f) => f.endsWith(".mdx"))
      .map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), "utf-8");
        const { data, content: body } = matter(content);
        return {
          slug: file.replace(".mdx", ""),
          frontmatter: data as ContentFrontmatter,
          content: body,
        };
      })
  );

  return items;
}

export async function getContentBySlug(
  type: "projects" | "learn" | "stories" | "notes",
  slug: string
): Promise<ContentItem | null> {
  try {
    const file = path.join(CONTENT_DIR, type, `${slug}.mdx`);
    const content = await fs.readFile(file, "utf-8");
    const { data, content: body } = matter(content);
    return {
      slug,
      frontmatter: data as ContentFrontmatter,
      content: body,
    };
  } catch {
    return null;
  }
}

export function sortByDate(items: ContentItem[], direction: "asc" | "desc" = "desc"): ContentItem[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    return direction === "desc" ? dateB - dateA : dateA - dateB;
  });
}

export async function generateSitemap() {
  const projects = await getAllContentByType("projects");
  const learn = await getAllContentByType("learn");
  const stories = await getAllContentByType("stories");
  const notes = await getAllContentByType("notes");

  return [
    { url: "/", priority: 1.0 },
    { url: "/about", priority: 0.9 },
    { url: "/contact", priority: 0.8 },
    { url: "/projects", priority: 0.9 },
    ...projects.map((p) => ({ url: `/projects/${p.slug}`, priority: 0.8 })),
    { url: "/learn", priority: 0.8 },
    ...learn.map((l) => ({ url: `/learn/${l.slug}`, priority: 0.7 })),
    { url: "/stories", priority: 0.8 },
    ...stories.map((s) => ({ url: `/stories/${s.slug}`, priority: 0.7 })),
    { url: "/notes", priority: 0.7 },
    ...notes.map((n) => ({ url: `/notes/${n.slug}`, priority: 0.6 })),
  ];
}
```

### Pattern D: MDX Custom Component

**File: `components/mdx/CodeBlock.tsx`**

> **Note:** Syntax highlighting is done at **build time** via `rehype-pretty-code`
> in the MDX pipeline (see `next.config.ts`). This component is the wrapper
> that `rehype-pretty-code` outputs into — it only handles the copy button
> client-side. No flash of unstyled code.

```typescript
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  children: React.ReactNode;
  /** Language label injected by rehype-pretty-code via data attribute */
  "data-language"?: string;
}

export function CodeBlock({ children, "data-language": language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    const text = preRef.current?.textContent ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mb-4 overflow-x-auto rounded-lg bg-background-elevated">
      {language && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-medium text-foreground-muted">{language}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
      <pre ref={preRef} className="overflow-x-auto p-4 text-sm">
        {children}
      </pre>
    </div>
  );
}
```

**Rehype-pretty-code setup in `next.config.ts`:**
```typescript
import rehypePrettyCode from "rehype-pretty-code";

// In your MDX options:
const mdxOptions = {
  rehypePlugins: [
    [rehypePrettyCode, { theme: "github-dark", keepBackground: false }],
  ],
};
```

## 5. Environment Variables Pattern

**File: `.env.example`**
```bash
# Next.js
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Supabase (public keys safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com

# Sentry (public key safe)
NEXT_PUBLIC_SENTRY_DSN=https://[project]@[org].ingest.sentry.io/[id]
```

**File: `.env.local`** (git-ignored, local development only)
```bash
# Copy from .env.example, fill in local values
```

## 6. TypeScript Conventions

**File: `types/content.ts`**
```typescript
export interface Project {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  coverImage: string;
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  coverImage?: string;
}

// Alias these across lanes (they're structurally identical)
export type Story = Article;
export type Note = Article;
```

## 7. Next.js Config Best Practices

**File: `next.config.ts`**
```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  typescript: {
    strictNullChecks: true,
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "[project].supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  redirects: async () => [
    {
      source: "/resume",
      destination: "/resume.pdf",
      permanent: false,
    },
  ],
};

export default config;
```

---

## Quick Reference: When Building

| Task | File | Pattern |
|---|---|---|
| Add a new project | Create `content/projects/[name].mdx` | Just write frontmatter + MDX, no code changes |
| Add a new tech stack badge style | `components/projects/TechBadge.tsx` | Check `--accent-*` tokens in `globals.css` |
| Fix homepage hero spacing | `app/page.tsx` or `components/home/Hero.tsx` | Check spacing scale in `globals.css` |
| Add a new MDX component (e.g. alert box) | `components/mdx/[Component].tsx` | Automatically available in all `.mdx` files, no import needed |
| Change dark/light colors | `app/globals.css` (`:root` and `.dark` blocks) | Re-test contrast with contrast checker |
