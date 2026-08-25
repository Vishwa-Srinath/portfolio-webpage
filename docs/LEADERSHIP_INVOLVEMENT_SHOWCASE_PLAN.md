# Leadership & Involvement Showcase Plan

Status: implemented locally; no real entries added; not committed or deployed

## 1. Purpose

Add a professional homepage section for work that does not belong inside a software project case study:

- leadership and service;
- event and organizing-committee work;
- competitions, awards, and winning moments; and
- research conferences, workshops, and other educational participation.

The section should help a recruiter understand what Vishwa did, what responsibility he held, and what resulted from it. It should not become a general photo gallery or make every attended event appear equally important.

## 2. Placement and naming

Homepage order:

1. Hero
2. Short biography
3. Featured Projects
4. **Leadership & Involvement** — new section

The existing **Explore** block is removed from the homepage because its destinations are already available through the site navigation and project content. Its component can remain in the repository for now; this avoids an unrelated deletion.

The presentation uses:

- eyebrow: `Beyond the classroom`
- heading: `Leadership & Involvement`
- introduction: `Selected moments of leadership, department service, competition, and continued learning.`

This wording is broader and more professional than “extracurricular gallery.”

## 3. Content taxonomy

Each entry belongs to one primary category:

| Internal value | Display label | Use for |
| --- | --- | --- |
| `leadership` | Leadership & Service | Leadership roles, mentoring, team responsibility, and department service |
| `organizing` | Event Organizing | Organizing committees, logistics, coordination, and special department events |
| `competition` | Competitions & Recognition | Competitions, awards, finalist placements, and winning moments |
| `learning` | Research & Learning | Research conferences, technical workshops, academic events, and educational participation |

The category is a navigation aid, not the main story. The entry must still explain the individual contribution.

## 4. Editorial structure

Every published entry should answer four questions in a small amount of text:

1. What was the event, role, or achievement?
2. Who organized it and when did it happen?
3. What did Vishwa personally contribute?
4. What was the outcome or significance?

Recommended content fields:

```yaml
---
title: "Exact event or achievement name"
slug: "short-stable-slug"
category: "leadership"
date: "2026-08-01"
dateLabel: "August 2026"
role: "Role or responsibility"
organization: "Department, society, university, or organizer"
location: "Optional location"
summary: "One factual sentence that gives the event context."
contribution: "One factual sentence describing Vishwa's responsibility or work."
outcome: "Optional verified result, recognition, or lesson."
featured: true
published: true
order: 10
images:
  - src: "/images/involvement/example/event-photo.webp"
    alt: "Meaningful description of the moment and people shown"
    caption: "Short context that is not already obvious from the image."
    width: 1600
    height: 1000
links:
  - label: "View certificate"
    url: "https://drive.google.com/..."
---
```

Unknown outcomes, dates, titles, roles, or measurements must be omitted instead of guessed. Attendance alone should not be exaggerated into leadership.

## 5. Information architecture

The homepage shows a curated set of approximately four to six featured entries. Entries remain separate from projects because they provide different evidence:

- projects demonstrate technical problem-solving;
- involvement demonstrates responsibility, initiative, teamwork, recognition, and continued learning.

When at least two categories are present, a small filter row appears:

`All · Leadership & Service · Event Organizing · Competitions · Research & Learning`

The filters remain text-first, compact, and horizontally scrollable on small screens. They do not use oversized pills or decorative icons.

## 6. Desktop sketch

```text
Beyond the classroom
Leadership & Involvement
Selected moments of leadership, department service, competition,
and continued learning.

[ All ] [ Leadership & Service ] [ Event Organizing ] [ Competitions ] [ Research & Learning ]

┌──────────────────────────────────────────────────────────────────────────────┐
│                                      │  COMPETITIONS & RECOGNITION           │
│                                      │                                      │
│                                      │  Event or achievement title          │
│       Active event photograph        │  Role · Organization · Date          │
│           (calm 16:10 crop)          │                                      │
│                                      │  Brief context.                      │
│                                      │  Contribution and verified outcome.  │
│                                      │                                      │
│                                      │  Optional evidence link ↗            │
├──────────────────────────────────────┴──────────────────────────────────────┤
│  Pause       Previous          01 / 05          Next        ○ ● ○ ○ ○        │
└──────────────────────────────────────────────────────────────────────────────┘
```

The image occupies slightly more than half of the card. The text area remains short enough to scan. There is one active story rather than a grid of competing photographs.

## 7. Mobile sketch

```text
Beyond the classroom
Leadership & Involvement
Short introduction.

< horizontally scrollable category filters >

┌───────────────────────────────┐
│       Event photograph        │
│          (16:10)              │
├───────────────────────────────┤
│ CATEGORY · DATE               │
│ Event or achievement title    │
│ Role · Organization           │
│ Brief context and contribution│
├───────────────────────────────┤
│ Pause   ‹    01 / 05    ›     │
└───────────────────────────────┘
```

Controls remain visible and large enough to use by touch. Text is never placed over a busy photograph.

## 8. Interaction specification

- One entry is shown at a time.
- The visible photograph changes every eight seconds only when autoplay is enabled. When an entry has multiple photographs, they are shown in order before advancing to the next entry.
- A visible Pause/Play button gives the visitor control.
- Previous and Next buttons are always available when more than one entry exists.
- Selecting a category or entry indicator moves directly to an entry. Entries with multiple photographs also expose compact manual photo controls.
- Rotation pauses while the section is hovered, while keyboard focus is inside it, or while the browser tab is hidden.
- Rotation does not silently restart after keyboard interaction; the visitor can explicitly press Play.
- `prefers-reduced-motion: reduce` disables autoplay and transition movement.
- The transition is limited to a short opacity change with at most a few pixels of movement. No parallax, marquee, 3D tilt, dramatic zoom, or stacked animation is used.
- Slide status is available to assistive technology without repeatedly interrupting the user.

## 9. Visual specification

The section reuses the current design system:

- background: `--bg` and `--bg-elevated`;
- text: `--fg` and `--fg-muted`;
- borders: one-pixel `--border` with a restrained accent highlight;
- accent: existing cyan for controls and violet for the section eyebrow;
- typography: the same Inter family used by the hero throughout the section; size, weight, casing, and spacing provide hierarchy without switching font families;
- corners: the existing moderate `rounded-2xl` treatment;
- width and spacing: the same `max-w-5xl`, `px-4`, and `py-16` rhythm as Featured Projects.

No new gradient, glassmorphism, neon effect, stock illustration, AI-generated decoration, or design dependency is introduced.

## 10. Image and evidence policy

- Store public website photographs under `portfolio-frontend/public/images/involvement/<slug>/` and serve them with Next Image through Vercel.
- Prefer WebP or a well-compressed JPEG. Retain enough resolution for a 1600 px wide desktop display.
- Record the actual width and height to prevent layout shift.
- Use a consistent landscape crop for the primary image. Portrait photographs can still use `object-fit: cover` with the important subject centered.
- Write alt text that explains the meaningful moment, not file appearance such as “image 1.”
- Keep a visible caption only when it adds context.
- Google Drive may be used for optional evidence documents, certificates, programmes, or reports. Do not hotlink Drive images into the carousel because share URLs are not stable image assets.
- Do not place these assets in AWS. This preserves the repository's zero-AWS-cost policy.

## 11. Technical shape

Initial implementation:

```text
content/experiences/
  EXPERIENCE_TEMPLATE.mdx.example
  README.md
  <one-file-per-entry>.mdx

public/images/involvement/<slug>/...
lib/experiences.ts
components/home/ExperienceShowcase.tsx
components/experiences/ExperienceCarousel.tsx
app/page.tsx
```

Responsibilities:

- `lib/experiences.ts`: server-only parsing, validation, filtering, and ordering;
- `ExperienceShowcase.tsx`: semantic homepage section and heading;
- `ExperienceCarousel.tsx`: the smallest possible client island for filtering, controls, and image rotation;
- MDX files: editable content, with no component changes required for normal updates.

The public section stays hidden when there are no `published: true` entries. This is preferable to showing invented achievements or a “coming soon” card. Entries may omit images initially; the UI supplies a quiet category-based fallback until a real photograph is added.

## 12. Why the backend is not used for version one

The browser controls carousel movement; no API is needed for animation. Keeping this content in MDX initially is:

- faster because it is built with the page;
- free and served with the existing Vercel frontend;
- version-controlled and reviewable;
- available even when the Lambda or database is unavailable; and
- less risky than extending the backend's existing content-lane schema for a small curated collection.

The backend's existing event concept is analytics-related, so new domain code uses `Experience` rather than the ambiguous `Event` name.

## 13. Future path

### Phase 1 — current implementation

- Content-driven homepage showcase.
- Local/Vercel-hosted images.
- Accessible filter and carousel controls.
- No fake content and no dead “View all” link.

### Phase 2 — when there are at least eight strong entries

- Add `/involvement` as a full archive page.
- Add year/category filtering and permanent shareable entry links.
- Reuse the same MDX files and data types.

### Phase 3 — only when editing through Git becomes inconvenient

- Move metadata to a Supabase table and images to the project's non-AWS storage service.
- Add a small authenticated admin/editor flow.
- Keep the same public data shape so the presentation components do not need redesigning.
- Add caching and a static fallback so a database interruption does not empty the homepage.

The AWS Lambda backend should not store images or be expanded merely to animate this section.

## 14. Acceptance checklist

- The section appears immediately below Featured Projects when at least one real entry is published.
- Explore no longer renders on the homepage.
- Content changes require editing only an MDX file and adding image assets.
- Four requested categories are supported.
- Autoplay is slow, pausable, keyboard-accessible, and disabled for reduced-motion users.
- Mobile layout remains readable and controls remain usable.
- Images use Next Image with dimensions, responsive sizing, useful alt text, and lazy loading.
- Light and dark themes use the existing tokens.
- No backend, database, AWS, deployment, architectural, or unrelated design change is made.
- Lint, TypeScript, and production build pass before handoff.

## 15. Research references

The design combines patterns observed in current student and early-career technical portfolios while keeping this site's simpler visual identity:

- [Brittany Chiang — curated featured work](https://brittanychiang.com/)
- [Isha Kalwani — distinct involvement and leadership section](https://www.ishakalwani.me/)
- [Jared Blase Sy — projects and extracurricular experience kept separate](https://jaredblase.github.io/)
- [Moeez Omair — responsibility and outcome-focused leadership stories](https://www.moeezomair.com/)
- [Sonali Sinha — projects, research, and recognition separated by evidence type](https://sonali-7.github.io/sonalisinha/)
- [W3C WAI carousel tutorial](https://www.w3.org/WAI/tutorials/carousels/)
- [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- [WCAG: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [Next.js image guidance](https://nextjs.org/docs/app/getting-started/images)
