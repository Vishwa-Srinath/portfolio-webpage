# DEPLOYMENT ARCHITECTURE REFERENCE
**Version:** 1.0 | **Last Updated:** 2026-07-10
**Purpose:** Single source of truth for *where this portfolio lives on the internet* — hosting choices, why each one was picked over its alternatives, full request topology, cost ceiling, and the upgrade path for when free stops being enough. Feed this + `DEPLOYMENT_SCRIPTS.md` + `MONITORING_MAINTENANCE.md` to a coding agent to execute the actual deploy.

**Relationship to existing docs:** This does not change anything in `FRONTEND_ARCHITECTURE.md`, `BACKEND_ARCHITECTURE.md`, `DATABASE_REFERENCE.md`/`DATABASE_SCHEMA_REFERENCE.md`, `API_CONTRACTS.md`, or `CODE_STYLE_GIT_WORKFLOW.md`. Those define *what the app is*. This defines *where it runs*.

---

## 0. TL;DR — What Runs Where

| Layer | Service | Plan | Monthly Cost | Why |
|---|---|---|---|---|
| Frontend (Next.js 15) | **Vercel** | Hobby | $0 | Built for Next.js App Router/ISR specifically; zero-config git deploys; 100GB bandwidth covers a portfolio comfortably |
| Backend (FastAPI) | **Render** | Free Web Service | $0 | Docker-native, your existing `Dockerfile` + `/api/v1/health` deploy as-is; sleeps when idle, which is *fine* here (see §4) |
| Database | **Supabase** | Free | $0 | Already your stack (pgvector for v2 RAG); Postgres + RLS + Storage in one place |
| Transactional email | **Resend** | Free | $0 | 3,000 emails/mo, already wired into `email_service.py` |
| DNS | **Cloudflare** | Free | $0 | Free DNS management, works with any registrar |
| Domain name | Any registrar (Namecheap, Porkbun, etc.) | — | **~$10–15/year** | The *only* line item that costs real money — everything else below is $0 |
| CI | **GitHub Actions** | Free (public or private repo) | $0 | 2,000 free minutes/month on private repos, unlimited on public |
| CD | Vercel + Render native Git integration | Free | $0 | Push to `main` → auto-deploy, no extra pipeline needed |
| Uptime monitoring | **UptimeRobot** | Free | $0 | 50 monitors, 5-min interval |
| Error tracking | **Sentry** | Free (Developer) | $0 | 5,000 errors/month, 1 user — plenty for a solo project |
| Keep-alive + backups | **GitHub Actions** (scheduled) | Free | $0 | One scheduled workflow solves both Supabase's 7-day pause *and* the "no free backups" problem |

**Total fixed cost: $0/month.** The only recommended real-money spend is a custom domain (~$10–15/year) so the site reads `vishwa.dev` instead of `something.vercel.app` — optional, but worth it for a recruiter-facing portfolio. Everything else in this document works identically on a free subdomain.

---

## 1. Constraints This Architecture Optimizes For

Stated explicitly so future-you (or an agent) doesn't second-guess these choices later:

1. **Solo maintainer.** No team, no on-call rotation. Every choice below favors "fewer moving parts" over "theoretically more scalable."
2. **Free, not cheapest-paid.** Every component has a genuine $0 tier, not a trial that expires.
3. **Public, recruiter-facing traffic.** Visitors are unpredictable in timing (a recruiter clicking a resume link, a spike from a YouTube video description, a classmate sharing the DSA study tool) but low in volume — realistically dozens to low hundreds of sessions/month, not thousands.
4. **Read-heavy, write-light.** Almost all traffic is *reading* content (Next.js static/ISR pages, no backend hit). The FastAPI backend is only touched for: contact form submissions, analytics events, and (v2) RAG queries. This asymmetry is why a backend that "sleeps" is an acceptable trade, not a compromise.
5. **Industry-standard over clever.** Every service chosen here is one a hiring engineer will recognize immediately (Vercel, Render, Supabase, GitHub Actions) — the deployment story itself is part of what a recruiter evaluates.

---

## 2. Full Topology

```
                                   ┌─────────────────────┐
                                   │   Visitor's Browser   │
                                   └──────────┬───────────┘
                                              │ HTTPS
                                              ▼
                          ┌───────────────────────────────────┐
                          │     Cloudflare DNS (free)           │
                          │  yourdomain.com  →  Vercel           │
                          │  api.yourdomain.com  →  Render        │
                          └──────────┬────────────────┬─────────┘
                                     │                │
                    ┌────────────────▼───┐   ┌────────▼─────────────────┐
                    │      VERCEL           │   │        RENDER              │
                    │  Next.js 15 (App Router)│   │  FastAPI (Docker, free)   │
                    │  - Static/ISR pages     │   │  - /api/v1/contact        │
                    │  - MDX content lanes    │   │  - /api/v1/health         │
                    │  - Server Components    │   │  - /api/v1/events         │
                    │  Hobby plan, $0          │   │  Sleeps after 15 min idle │
                    │  Auto-deploy on git push │   │  Auto-deploy on git push  │
                    └───────────┬─────────────┘   └───────────┬───────────────┘
                                │                              │
                                │  fetch(NEXT_PUBLIC_API_URL)   │
                                │  (contact form, analytics)     │
                                └──────────────┬─────────────────┘
                                               ▼
                                  ┌─────────────────────────────┐
                                  │        SUPABASE (free)         │
                                  │  Postgres + RLS + Storage       │
                                  │  messages / events / content_*  │
                                  │  Pauses after 7 days with        │
                                  │  zero API requests               │
                                  └──────────────┬───────────────────┘
                                                 │
                          ┌──────────────────────┼───────────────────────┐
                          │                      │                       │
                 ┌────────▼────────┐   ┌─────────▼─────────┐   ┌────────▼─────────┐
                 │  RESEND (free)    │   │  GITHUB ACTIONS     │   │   SENTRY (free)    │
                 │  Contact-form      │   │  (scheduled, every   │   │   Error tracking,   │
                 │  notification email │   │  3 days)             │   │   frontend + backend │
                 │  3,000/mo included  │   │  - pings /health     │   └────────────────────┘
                 └────────────────────┘   │    (keeps Supabase +  │
                                           │    Render both warm)  │
                                           │  - pg_dump → private  │
                                           │    repo (backup)       │
                                           └────────────────────────┘

                          ┌─────────────────────────────────────┐
                          │        UPTIMEROBOT (free)               │
                          │   Polls yourdomain.com every 5 min       │
                          │   and api.yourdomain.com/api/v1/health    │
                          │   Emails you if either goes down          │
                          └─────────────────────────────────────────┘
```

---

## 3. Component Decisions (What Was Considered, What Was Picked, Why)

### 3.1 Frontend Hosting

| Option | Verdict | Reasoning |
|---|---|---|
| **Vercel (Hobby)** ✅ | **Chosen** | Built by the Next.js team; App Router, ISR, image optimization, and MDX all work with zero config. 100GB bandwidth/month and 1M function invocations are far beyond what this site will use. Free tier is explicitly personal/non-commercial — matches an undergraduate portfolio exactly. |
| Cloudflare Pages | Rejected for now | Genuinely free and fast, but Next.js App Router support requires the `@cloudflare/next-on-pages` adapter, which lags behind Vercel on newer App Router features (this project uses Server Components, `generateMetadata`, and route groups heavily per `FRONTEND_ARCHITECTURE.md`). Revisit only if Vercel's non-commercial restriction ever becomes a real blocker. |
| Netlify | Rejected | Comparable free tier to Vercel but weaker native support for the specific Next.js 15 patterns already written into this project's docs (nested layouts, MDX pipeline via `rehype-pretty-code`). No reason to fight the framework. |
| Self-hosted VPS (Hetzner, etc.) | Rejected | Would remove the *only* meaningful constraint (Vercel's non-commercial clause) but adds real ongoing sysadmin work — patching, TLS renewal, process supervision — for a solo maintainer. Revisit only if this ever becomes commercial (e.g., you start selling access to a tool built on the site). |

**One clause to know about:** Vercel Hobby is for personal, non-commercial use. A portfolio, blog, and contact form are squarely inside that. If a future feature charges money (e.g., a paid course, a SaaS spun out of the RAG feature), move *that specific thing* to Pro ($20/mo) or its own deployment — the portfolio itself stays on Hobby.

### 3.2 Backend Hosting

| Option | Verdict | Reasoning |
|---|---|---|
| **Render (Free Web Service)** ✅ | **Chosen** | Docker-native — your existing `Dockerfile` and `HEALTHCHECK` (`BACKEND_ARCHITECTURE.md` §16) deploy unmodified. `/api/v1/health` (already built) is exactly what Render's health checks expect. No credit card required. |
| Google Cloud Run | Considered, not chosen | Has a genuine always-free tier (2M requests/month) and *no* forced sleep behavior in the way Render has, which is objectively better for cold-start avoidance. Rejected only for **simplicity**: Cloud Run requires a GCP project, IAM, and `gcloud` CLI familiarity — meaningfully more operational surface than Render's "connect repo, click deploy." If Render's cold starts ever become a real problem (see §4), migrate here first — the Dockerfile is already portable. |
| Railway | Rejected | No longer has a persistent free tier as of 2025 restructuring — now a $5 usage credit that runs out for an always-on service. Doesn't meet the "free, not just cheap" constraint. |
| Fly.io | Rejected | Free allowance was removed for new signups; a payment method is now required even for the smallest VM. Doesn't meet the free-tier constraint for new accounts. |
| Vercel Serverless Functions (skip FastAPI, rewrite backend as Next.js API routes) | Rejected | Would mean throwing away the entire `BACKEND_ARCHITECTURE.md` design (FastAPI, Pydantic validation, the rate-limiting dependency, pytest suite) to save one hosting hop. Not worth it — FastAPI-on-Render is a more standard, more portable, more resume-relevant pattern than routing everything through Next.js API routes. |

**What "free" costs you here:** Render's free instance has 512MB RAM / 0.1 vCPU, spins down after 15 minutes of no inbound traffic, and takes ~30-60 seconds to wake back up. Because almost everything on this site is static (served by Vercel, never touching Render), the only user-facing cold start is: *the first contact-form submission after a quiet period takes ~30-60s longer than usual.* That's an acceptable trade for $0/month — see §4 for exactly how to make this invisible to the user.

### 3.3 Database

Already decided in your existing docs (Supabase, chosen for pgvector + RLS + the migration path already written in `DATABASE_SCHEMA_REFERENCE.md`). The two free-tier behaviors that matter for *deployment* specifically:

- **7-day pause on zero activity** → solved by the scheduled GitHub Action in §3.6 (also doubles as your backup job).
- **No automatic backups on free tier** → also solved by that same job (`pg_dump` → private GitHub repo, see `DEPLOYMENT_SCRIPTS.md` §5 and `MONITORING_MAINTENANCE.md` §3).

500MB database storage and 5GB egress are non-issues at this project's scale (per `DATABASE_SCHEMA_REFERENCE.md` §11's own row-count expectations — "dozens now, hundreds eventually" for `content_items`).

### 3.4 Email

**Resend**, already specified in `BACKEND_ARCHITECTURE.md` §6. Free tier: 3,000 emails/month, 100/day, 1 verified domain. A contact form on a portfolio will not come close to this — even 100 messages in a single day (extremely unlikely) fits inside the daily cap.

### 3.5 DNS & Domain

- **DNS: Cloudflare (free).** Point your domain's nameservers at Cloudflare regardless of where you buy it — free tier includes unlimited DNS records, free SSL passthrough (though Vercel/Render already terminate TLS themselves), and protects your `MX`/email records if you later add a custom email address.
- **Domain registration:** buy from any registrar (Namecheap, Porkbun, Cloudflare Registrar itself at cost). This is the one recommended paid line item, ~$10–15/year for a `.dev` or `.com`. **If you want to stay at literal $0:** skip this entirely and use the free subdomains both platforms give you (`your-project.vercel.app` for the frontend, `your-service.onrender.com` for the backend) — nothing else in this architecture changes.

### 3.6 CI/CD

No separate CI/CD platform needed — this is a deliberate simplicity choice:

- **Vercel's GitHub integration** already builds and deploys on every push to `main`, and creates a preview URL for every PR (matching the PR workflow already defined in `CODE_STYLE_GIT_WORKFLOW.md` §1).
- **Render's GitHub integration** does the same for the backend.
- **GitHub Actions** is used for exactly one thing this project needs that the above two don't cover: a *scheduled* job (not triggered by a push) that keeps Supabase awake and takes backups. See `DEPLOYMENT_SCRIPTS.md` §5 for the full workflow file.

This means "CI" in the traditional sense (lint + test on every PR, per `CODE_STYLE_GIT_WORKFLOW.md` §5 checklist) also runs via a lightweight GitHub Actions workflow — see `DEPLOYMENT_SCRIPTS.md` §6.

### 3.7 Monitoring & Backups

Covered in full in `MONITORING_MAINTENANCE.md`. Summary: UptimeRobot (uptime), Sentry (errors, both frontend and backend), Vercel Analytics (traffic), and the GitHub Actions keep-alive/backup job. All free.

---

## 4. Request Lifecycle — Cold vs. Warm Path

Understanding this is the key to why the free-tier trade-offs don't actually hurt the visitor experience:

**Cold path (rare — only hits the backend after 15+ min of no traffic):**
```
Visitor submits contact form
  → fetch(NEXT_PUBLIC_API_URL + "/api/v1/contact")
  → Render receives request, service is asleep
  → Render spins up container (~30-60s)
  → FastAPI handles request, validates, writes to Supabase, sends via Resend
  → Response returns
```

**Warm path (the common case — everything else on the site):**
```
Visitor loads any page (/, /projects, /learn/kruskals-mst, /radar, etc.)
  → Served directly from Vercel's edge (static or ISR)
  → Zero calls to Render, zero calls to Supabase
  → Sub-200ms typical
```

**Design implication for the frontend:** the contact form (`API_CONTRACTS.md` §1) already shows a `loading` state while `setLoading(true)` is active — this is exactly the UI that absorbs a cold start gracefully. No code change needed; just don't remove that loading state in the name of "simplifying" the component later. Optionally, add copy like *"Sending — this can take up to a minute if I haven't had a visitor in a while"* under the submit button so a slow response doesn't read as broken.

The keep-alive job (§3.6, detailed in `DEPLOYMENT_SCRIPTS.md` §5) pings `/api/v1/health` every 3 days — frequent enough to keep Supabase from ever pausing, infrequent enough that it has no meaningful effect on Render's 750 free instance-hours/month budget, and it is *not* the kind of continuous self-ping Render's own docs discourage (that pattern is about defeating spin-down every few minutes to fake an always-on service; a ping every 3 days is a legitimate scheduled health/backup job, the same pattern any production system uses).

---

## 5. Environments

Kept deliberately simple — two environments, not three, because a third ("staging") environment is where solo-maintainer projects usually accumulate maintenance debt without adding real safety:

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| **Local development** | `pnpm dev` on `localhost:3000` | `uvicorn app.main:app --reload` on `localhost:8000` | Local Supabase via `supabase start`, or point at the same free Supabase project's dev-safe tables |
| **Production** | Vercel, `main` branch, `yourdomain.com` | Render, `main` branch, `api.yourdomain.com` | Supabase (single free project) |
| **Preview (per-PR, ad hoc)** | Automatic Vercel preview URL per pull request | Not auto-deployed (Render free tier = 1 service; manually spin up a second free Render service only if testing a risky backend change) | Same Supabase project (be careful with writes from preview branches — see note below) |

**Note on preview + shared database:** because there's one free Supabase project, a Vercel preview deployment of a PR still talks to the *production* database by default (via the same `NEXT_PUBLIC_API_URL`). This is fine for read-only content changes (the common case — a new MDX-equivalent content item, a copy tweak). For anything that writes (e.g., testing a change to the contact-form flow), test against local Supabase (`supabase start`) instead of the preview URL. This is the one place where "free forces a simplification" — accept it rather than paying for a second Supabase project purely for staging.

---

## 6. Security Checklist (Deployment-Specific)

These supplement — don't replace — the security patterns already in `BACKEND_ARCHITECTURE.md` (rate limiting, honeypot) and `DATABASE_SCHEMA_REFERENCE.md` (RLS on every table):

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set **only** as a Render environment variable — never in any frontend env var, never committed, never in `NEXT_PUBLIC_*`
- [ ] Render environment variables set via the dashboard (or `render.yaml` referencing a secret group), not hardcoded in the Dockerfile
- [ ] Vercel environment variables set per-environment (Production vs. Preview vs. Development) via the Vercel dashboard, matching `.env.example`
- [ ] CORS `allowed_origins` in `core/config.py` includes only `https://yourdomain.com`, `https://www.yourdomain.com`, and `http://localhost:3000` — no wildcard, matching `BACKEND_ARCHITECTURE.md` §4
- [ ] `TrustedHostMiddleware` allowed_hosts matches your actual domain, not left as `yourdomain.com` placeholder
- [ ] GitHub repo secrets (for the Actions backup/keep-alive job) use repo-level **Secrets**, not plaintext in the workflow YAML
- [ ] Custom domain has HTTPS enforced (automatic on both Vercel and Render — verify the padlock after first deploy, don't assume)
- [ ] Supabase RLS is verified active on every table before the first production write (per `DATABASE_REFERENCE.md` §10 "Check RLS Policies" query)

---

## 7. Cost Ceiling & Upgrade Triggers

This architecture stays at $0 (+ optional domain) up to roughly:

- **~50,000-100,000 monthly page views** (Vercel Hobby bandwidth ceiling)
- **~750 hours/month of backend uptime**, i.e., the backend can be "awake" nearly continuously and still be free — you'd only hit this if traffic became frequent enough that Render rarely sleeps
- **500MB of database rows** (Supabase) — per `DATABASE_SCHEMA_REFERENCE.md` §11's own estimates, this covers the content tables for years
- **3,000 contact-form-triggered emails/month** (Resend) — effectively unlimited for a portfolio

| Signal | What to upgrade | Cost |
|---|---|---|
| Site starts generating revenue (paid course, sponsorships, a monetized tool) | Vercel Hobby → Pro | $20/mo |
| Cold starts on the contact form become a genuine visitor complaint (e.g., during a job search when the site gets sustained daily traffic) | Render Free → Starter | $7/mo |
| Database approaches 500MB or you need daily automated backups instead of the 3-day GitHub Action | Supabase Free → Pro | $25/mo |
| Sending >100 emails in a single day | Resend Free → Pro | $20/mo |

None of these are needed to launch. Revisit this table if traffic patterns actually change — don't pre-upgrade speculatively.

---

## Quick Reference

| Task | Where | Doc |
|---|---|---|
| Deploy the frontend for the first time | Vercel dashboard, import GitHub repo | `DEPLOYMENT_SCRIPTS.md` §3 |
| Deploy the backend for the first time | Render dashboard, new Web Service from repo | `DEPLOYMENT_SCRIPTS.md` §2 |
| Point a custom domain at both | Cloudflare DNS + Vercel/Render domain settings | `DEPLOYMENT_SCRIPTS.md` §4 |
| Set up the keep-alive/backup job | `.github/workflows/keepalive-backup.yml` | `DEPLOYMENT_SCRIPTS.md` §5 |
| Add uptime/error monitoring | UptimeRobot + Sentry | `MONITORING_MAINTENANCE.md` §1-2 |
| Something in production breaks | Rollback procedure | `DEPLOYMENT_SCRIPTS.md` §8 |
