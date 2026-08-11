# SUPERSEDED BACKEND PLAN

The container/ECR backend in this document is retained only as historical
context. Use [`../AWS_LAMBDA_ZIP_DEPLOYMENT.md`](../AWS_LAMBDA_ZIP_DEPLOYMENT.md)
for the current zero-fixed-cost ZIP deployment.

# DEPLOYMENT ARCHITECTURE REFERENCE
**Version:** 2.0 (AWS backend) | **Last Updated:** 2026-07-15
**Purpose:** Single source of truth for *where this portfolio lives on the internet* — hosting choices, why each one was picked over its alternatives, full request topology, cost ceiling, and the upgrade path for when free stops being enough. Feed this + `DEPLOYMENT_SCRIPTS.md` + `MONITORING_MAINTENANCE.md` to a coding agent to execute the actual deploy.

**Changelog:** v2.0 replaces Render (free Web Service) with **AWS Lambda** for the backend, at explicit request, with "must stay on a genuinely free tier" as the overriding constraint. Every other component (Vercel, Supabase, Resend, Cloudflare, GitHub Actions, UptimeRobot, Sentry) is unchanged from v1.0.

**Relationship to existing docs:** This does not change anything in `FRONTEND_ARCHITECTURE.md`, `DATABASE_REFERENCE.md`/`DATABASE_SCHEMA_REFERENCE.md`, or `API_CONTRACTS.md`'s request/response contracts. It changes one thing in `BACKEND_ARCHITECTURE.md`: the `Dockerfile` (§16) gets one extra line, covered in §3.2 below and spelled out in `DEPLOYMENT_SCRIPTS.md` §2.

---

## 0. TL;DR — What Runs Where

| Layer | Service | Plan | Monthly Cost | Why |
|---|---|---|---|---|
| Frontend (Next.js 15) | **Vercel** | Hobby | $0 | Built for Next.js App Router/ISR specifically; zero-config git deploys; 100GB bandwidth covers a portfolio comfortably |
| Backend (FastAPI) | **AWS Lambda** (container image) | Always-Free tier | $0 (see one caveat below) | 1M requests + 400,000 GB-seconds/month, **permanently** — not a 12-month new-account trap like EC2/RDS |
| Backend image registry | **Amazon ECR** (private repo) | — | **~$0.00–0.03/mo** | The one AWS component that isn't perpetually free — see §3.2 for the honest breakdown and how to avoid even this |
| Database | **Supabase** | Free | $0 | Already your stack (pgvector for v2 RAG); Postgres + RLS + Storage in one place |
| Transactional email | **Resend** | Free | $0 | 3,000 emails/mo, already wired into `email_service.py` |
| DNS | **Cloudflare** | Free | $0 | Free DNS + proxy, also how the API gets a clean custom domain without CloudFront/ACM (§3.5) |
| Domain name | Any registrar | — | **~$10–15/year** | The only unavoidable real-money line item — everything else is $0 |
| CI/CD | **GitHub Actions** | Free | $0 | Builds/pushes the image, updates the Lambda function, on every push to `main` |
| Cost safety net | **AWS Budgets** (Zero-Spend template) + reserved concurrency | Free | $0 | Mandatory, not optional — see §3.8 |
| Uptime monitoring | **UptimeRobot** | Free | $0 | 50 monitors, 5-min interval |
| Error tracking | **Sentry** | Free (Developer) | $0 | 5,000 errors/month, 1 user |
| Keep-alive + backups | **GitHub Actions** (scheduled) | Free | $0 | Keeps Supabase from pausing, backs up the database |

**Total fixed cost: $0/month** (domain aside), with one small, transparent asterisk on ECR storage — explained in full in §3.2 so there are no surprises.

---

## 1. Constraints This Architecture Optimizes For

1. **Solo maintainer.** No team, no on-call rotation.
2. **Genuinely free, verified, not "free trial."** Every component's free tier was checked against current 2026 terms before being included here — see §3 for the receipts on each one.
3. **Never bills without explicit action.** This is the constraint that made AWS harder to recommend than Render in the first pass: Render *cannot* bill you without a payment method on file — it just suspends. AWS *can* bill you by default. Because you specifically asked for AWS with "surely free" as a hard requirement, §3.8 builds the guardrails that make AWS behave the same way Render does by default: fail closed, not open.
4. **Public, recruiter-facing traffic.** Low volume, unpredictable timing — dozens to low hundreds of sessions/month realistically.
5. **Read-heavy, write-light.** Nearly all traffic is static/ISR pages served by Vercel; the backend is only touched for the contact form, analytics events, and (v2) RAG queries.
6. **Industry-standard over clever.** AWS Lambda specifically has real resume value for a CS&E student — that's presumably part of why you asked for it over Render, and it's a legitimate reason on its own.

---

## 2. Full Topology

```
                                   ┌─────────────────────┐
                                   │   Visitor's Browser   │
                                   └──────────┬───────────┘
                                              │ HTTPS
                                              ▼
                          ┌───────────────────────────────────┐
                          │     Cloudflare DNS (free, proxied)  │
                          │  yourdomain.com  →  Vercel           │
                          │  api.yourdomain.com  →  Lambda        │
                          │  Function URL (CNAME, proxied)         │
                          └──────────┬────────────────┬─────────┘
                                     │                │
                    ┌────────────────▼───┐   ┌────────▼──────────────────────┐
                    │      VERCEL           │   │       AWS LAMBDA                │
                    │  Next.js 15 (App Router)│   │  FastAPI + Lambda Web Adapter   │
                    │  - Static/ISR pages     │   │  (container image, from ECR)    │
                    │  - MDX content lanes    │   │  - /api/v1/contact               │
                    │  - Server Components    │   │  - /api/v1/health (readiness)    │
                    │  Hobby plan, $0          │   │  - /api/v1/events                │
                    │  Auto-deploy on git push │   │  Function URL, no API Gateway     │
                    └───────────┬─────────────┘   │  Reserved concurrency: 5 (capped) │
                                │                  │  Always-Free: 1M req+400K GB-s/mo  │
                                │  fetch(NEXT_PUBLIC_API_URL)   └──────────┬──────────────┘
                                │  (contact form, analytics)               │
                                └────────────────────────┬──────────────────┘
                                                          ▼
                                             ┌─────────────────────────────┐
                                             │        SUPABASE (free)         │
                                             │  Postgres + RLS + Storage       │
                                             │  messages / events / content_*  │
                                             │  Pauses after 7 days idle         │
                                             └──────────────┬───────────────────┘
                                                            │
                          ┌──────────────────────┬──────────┼───────────────────────┐
                          │                      │          │                       │
                 ┌────────▼────────┐   ┌─────────▼──────┐  │              ┌────────▼─────────┐
                 │  RESEND (free)    │   │ GITHUB ACTIONS  │  │              │   SENTRY (free)    │
                 │  Contact-form      │   │ (scheduled,     │  │              │   Error tracking,   │
                 │  notification email │   │  every 3 days)  │  │              │   frontend + backend │
                 │  3,000/mo included  │   │  - pings /health│  │              └────────────────────┘
                 └────────────────────┘   │  - pg_dump →    │  │
                                           │    private repo  │  │
                                           └───────────────────┘  │
                                                                   │
                          ┌─────────────────────────────────────┐ │
                          │      AWS BUDGETS (Zero-Spend, free)    │◄┘
                          │  Emails you the instant spend > $0      │
                          └─────────────────────────────────────────┘

                          ┌─────────────────────────────────────┐
                          │        UPTIMEROBOT (free)               │
                          │   Polls yourdomain.com and                │
                          │   api.yourdomain.com/api/v1/health         │
                          │   every 5 min, emails on downtime           │
                          └─────────────────────────────────────────┘
```

---

## 3. Component Decisions

### 3.1 Frontend Hosting — unchanged from v1.0

**Vercel Hobby.** See rationale in the original v1.0 doc — nothing about the frontend changes when the backend moves to AWS. Vercel Hobby is personal/non-commercial use, which matches a student portfolio exactly.

### 3.2 Backend Compute — AWS Lambda (replaces Render)

| Option | Verdict | Reasoning |
|---|---|---|
| **AWS Lambda** ✅ | **Chosen** | Free tier is **1 million requests + 400,000 GB-seconds/month, and it never expires** — this is AWS's "Always Free" category, distinct from the 12-months-only "Free Tier" category that EC2/RDS fall into. At 512MB memory and a generous 300ms average duration (FastAPI + a network round-trip to Supabase/Resend), that's ~0.15 GB-seconds per invocation — the compute allowance alone covers **~2.6 million invocations/month** before you'd pay a cent, and the request cap (1M) would bind first anyway, which a portfolio contact form will never approach. |
| EC2 (t2/t3.micro) | Rejected | Time-boxed. Even the *newest* AWS account structure (accounts created after July 15, 2025) replaced the old 12-months-free model with an expiring credit — after which EC2 bills at standard rates whether you remember to stop the instance or not. This is the exact opposite of "surely free." |
| ECS Fargate | Rejected | No permanent free tier — bills per-second from the first invocation. |
| Render (free Web Service) | Superseded | Was the v1.0 recommendation specifically because it *can't* bill you without a card on file. Replaced at your explicit request for AWS, with the guardrails in §3.8 doing the job Render did automatically. |

**How your existing backend deploys almost unmodified:** AWS publishes an official, first-party adapter — the **AWS Lambda Web Adapter** (`aws/aws-lambda-web-adapter` on GitHub, maintained by AWS itself) — that lets an ordinary `uvicorn`-served FastAPI app run inside Lambda's execution model with **zero changes to your route handlers, Pydantic models, or the rate-limiting dependency** in `BACKEND_ARCHITECTURE.md`. The only change is one line added to your existing `Dockerfile`:

```dockerfile
FROM python:3.12-slim
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 /lambda-adapter /opt/extensions/lambda-adapter
# ...rest of your existing Dockerfile is unchanged...
ENV PORT=8000
ENV AWS_LWA_READINESS_CHECK_PATH=/api/v1/health
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The adapter runs as a Lambda Extension alongside your normal `uvicorn` process, translating Lambda's invoke events into HTTP requests against `localhost:8000` — your app never knows it isn't running on Render. Full build/push/deploy steps are in `DEPLOYMENT_SCRIPTS.md` §2.

**The one honest asterisk — Amazon ECR image storage:** Lambda container images must be stored in a **private** ECR repository (Lambda does not support pulling from ECR Public). ECR's private-repo free tier is **500MB/month for the first 12 months on new AWS accounts only** — after that, or on an existing account, it's $0.10/GB-month. A FastAPI + Lambda Web Adapter image on `python:3.12-slim` typically lands around 150–250MB. With an ECR **lifecycle policy** keeping only the single most recent image tag (set up in `DEPLOYMENT_SCRIPTS.md` §2), realistic cost once/if the free tier lapses is **about $0.02–0.03/month** — not contractually $0, but the smallest fraction of a cent AWS's pricing model allows for this workload. Two ways to handle this, your call:
- **Accept it.** ~$0.03/month is arguably still "surely free" in every practical sense, and it's the best-documented, most agent-reproducible path (this is AWS's own official example pattern).
- **Eliminate it entirely.** Lambda also supports deploying from a **.zip package** (no container, no ECR at all) by attaching the Lambda Web Adapter as a **Lambda Layer** instead of baking it into an image. This removes the ECR line item completely. The trade-off: the exact handler/bootstrap wiring for a zip-packaged Python app is more fiddly and less thoroughly documented by AWS than the container path, so if you want this route, tell the agent to follow the **"Zip Packages" guide in `aws/aws-lambda-web-adapter`'s README directly** at build time rather than working from a fixed snippet here — layer ARN version numbers change, and getting the bootstrap wrapper wrong fails silently. The container+ECR path above is what `DEPLOYMENT_SCRIPTS.md` implements by default; this is documented as the escape hatch if the $0.03/month genuinely isn't acceptable.

### 3.3 Database, 3.4 Email — unchanged from v1.0

Supabase (free) and Resend (free) — see v1.0 rationale, nothing changes here since neither depends on which compute platform serves the API.

### 3.5 DNS & Domain

Same as v1.0 with one addition: a **Lambda Function URL** doesn't support native custom-domain mapping (that's an API Gateway feature, and API Gateway's free tier is the 12-months-only kind — avoided entirely by using a Function URL instead). The workaround, using infrastructure you already have:

- Create the Function URL (`https://<url-id>.lambda-url.<region>.on.aws`) with `AuthType: NONE`.
- In **Cloudflare DNS** (already your DNS provider), add a **CNAME** record: `api.yourdomain.com` → `<url-id>.lambda-url.<region>.on.aws`, with the record **proxied** (orange cloud, not grey).
- Cloudflare terminates TLS with its free Universal SSL and forwards to the Function URL. No CloudFront, no ACM certificate, no extra cost, no extra service to maintain.

### 3.6 CI/CD

Vercel's GitHub integration is unchanged. The backend side now needs an actual build+push+deploy step (Lambda has no native "connect your GitHub repo" auto-deploy the way Render/Vercel do), handled by a GitHub Actions workflow on every push to `main`:

```
build Docker image → push to ECR → aws lambda update-function-code
```

**Authentication: use GitHub's OIDC provider, not long-lived AWS access keys.** This is both the modern security-standard pattern (no static credentials sitting in GitHub Secrets that could leak) and directly relevant to your "surely free" requirement — a leaked long-lived AWS key is the single most common way solo developers end up with a surprise five-figure bill from someone else's cryptomining. OIDC means GitHub Actions assumes a narrowly-scoped IAM role for the duration of the job only, no credentials stored anywhere. Full setup in `DEPLOYMENT_SCRIPTS.md` §6.

### 3.7 Monitoring & Backups

Unchanged in kind, adjusted in detail — see `MONITORING_MAINTENANCE.md`. Backend logs now live in **CloudWatch Logs** instead of Render's log stream; retention is set to 7 days (default is "never expire," which very slowly accrues storage cost — capping retention avoids that).

### 3.8 Cost Safety Net (New Section — This Is the Part That Replaces Render's Built-In Safety)

Render can't bill you past free tier without a card on file. AWS can. Since you asked for AWS with "surely free" as a hard requirement, these three controls are **mandatory, not optional** — set them up in the same session you create the Lambda function, before it ever receives real traffic:

1. **AWS Budgets → Zero-Spend Budget template.** Free to create. Set the threshold to $0.01. You get an email the moment forecasted *or* actual spend crosses zero — this is an AWS-provided template built for exactly this scenario, not a custom workaround.
2. **Reserved concurrency, set to a small fixed number (recommended: 5).** This is the control that actually bounds worst-case cost, as opposed to alerting you after the fact — it hard-caps how many invocations can run at the same time, regardless of how much traffic (or bot flood, or scraper, or accidental infinite-retry bug in your own frontend) hits the endpoint. Combined with a short function timeout (recommended: 10 seconds, matching the kind of work `/api/v1/contact` and `/api/v1/health` actually do), this puts a hard ceiling on GB-seconds burn even in a worst-case traffic spike.
3. **No VPC attachment.** Your Lambda function only needs outbound HTTPS to Supabase and Resend — both public endpoints reachable over the internet, no AWS-internal networking required. Attaching a Lambda to a VPC "just in case" is the single most common way a supposedly-free serverless project ends up with a NAT Gateway line item (~$33/month plus data processing) on the bill. Don't attach one.

Together, these three replicate what Render gave you automatically: a system that fails by stopping, not by billing.

---

## 4. Request Lifecycle — Cold vs. Warm Path

**Cold path (backend invocation after the function has been idle):**
```
Visitor submits contact form
  → fetch(NEXT_PUBLIC_API_URL + "/api/v1/contact")
  → Lambda has no warm execution environment
  → Lambda provisions one (container image pull is cached after first pull;
    cold start for a FastAPI app on this pattern is typically low
    single-digit seconds, not the ~30-60s you'd see with a sleeping
    Render instance)
  → Lambda Web Adapter starts uvicorn, readiness check passes
  → FastAPI handles the request, validates, writes to Supabase, sends via Resend
  → Response returns
```

**Warm path (the common case — everything else on the site):**
```
Visitor loads any page (/, /projects, /learn/kruskals-mst, /radar, etc.)
  → Served directly from Vercel's edge (static or ISR)
  → Zero calls to Lambda, zero calls to Supabase
  → Sub-200ms typical
```

Lambda's cold start here is meaningfully faster than the Render equivalent (Lambda doesn't "sleep" the way a Render free instance does — it just has no warm environment for the *first* request in a while, and container image caching keeps subsequent cold starts fast). The contact form's existing `loading` state (already in `API_CONTRACTS.md` §1) still absorbs this gracefully — no code change needed.

The keep-alive job (pinging `/api/v1/health` every 3 days, unchanged from v1.0) still matters here for one reason only: **Supabase's 7-day pause**, not Lambda — Lambda itself has no equivalent "goes to sleep and stays asleep" behavior to work around.

---

## 5. Environments — unchanged from v1.0

Same two-environment approach (local + production, Vercel previews as ad hoc staging) as v1.0. Local backend development still runs plain `uvicorn app.main:app --reload` — the Lambda Web Adapter only matters in the deployed container; nothing changes about how you develop locally.

---

## 6. Security Checklist (Deployment-Specific, AWS Version)

- [ ] Lambda execution role uses **AWS-managed `AWSLambdaBasicExecutionRole`** only (CloudWatch Logs write access) — no broader permissions attached; the function never touches another AWS service
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and other secrets set as **Lambda environment variables** (encrypted at rest by AWS's default KMS key) — never baked into the Docker image, never committed
- [ ] GitHub Actions authenticates to AWS via **OIDC + a narrowly-scoped IAM role** (permissions: push to this one ECR repo, update this one Lambda function — nothing else), not static access keys in GitHub Secrets
- [ ] Function URL `AuthType` is `NONE` (public, matching a public API) but CORS is still enforced at the FastAPI layer via `allowed_origins` in `core/config.py`, unchanged from `BACKEND_ARCHITECTURE.md` §4
- [ ] Reserved concurrency and the Zero-Spend Budget (§3.8) are live **before** the Function URL is shared anywhere public
- [ ] No VPC attached to the function (§3.8)
- [ ] ECR lifecycle policy limits stored image tags to 1 (keeps both cost and attack surface minimal)
- [ ] CloudWatch Logs retention capped at 7 days (Lambda's default is indefinite retention, which isn't itself expensive at this volume but should still be bounded deliberately, not left on "never")
- [ ] Custom domain (`api.yourdomain.com`) has Cloudflare's proxy (orange cloud) enabled, not just DNS-only (grey cloud) — this is what provides TLS termination without CloudFront

---

## 7. Cost Ceiling & Upgrade Triggers

| Signal | What to do | Cost |
|---|---|---|
| Reserved concurrency of 5 is genuinely being hit (visible in CloudWatch metrics as throttled invocations) | Raise the reserved concurrency limit — still free up to the 1M request / 400K GB-s ceiling | $0 |
| Site starts generating revenue | Vercel Hobby → Pro | $20/mo |
| You decide the ECR asterisk isn't acceptable even at $0.03/mo | Migrate to the zip+Layer deployment path (§3.2) | $0 |
| Database approaches 500MB or you need real automated backups | Supabase Free → Pro | $25/mo |
| Sustained traffic actually approaches 1M requests/month | You have a real audience — congratulations; re-evaluate Lambda pricing at that point, likely still single-digit dollars/month | Variable, small |

None of these are needed to launch.

---

## Quick Reference

| Task | Where | Doc |
|---|---|---|
| Deploy the frontend for the first time | Vercel dashboard, import GitHub repo | `DEPLOYMENT_SCRIPTS.md` §3 |
| Build + deploy the backend to Lambda | ECR + Lambda console/CLI | `DEPLOYMENT_SCRIPTS.md` §2 |
| Point a custom domain at both | Cloudflare DNS + Vercel domain settings + Function URL CNAME | `DEPLOYMENT_SCRIPTS.md` §4 |
| Set up GitHub Actions CD (OIDC) | `.github/workflows/deploy-backend.yml` | `DEPLOYMENT_SCRIPTS.md` §6 |
| Set up the keep-alive/backup job | `.github/workflows/keepalive-backup.yml` | `DEPLOYMENT_SCRIPTS.md` §5 |
| Set up AWS Budgets + reserved concurrency | AWS Console, one-time | `DEPLOYMENT_SCRIPTS.md` §7 |
| Add uptime/error monitoring | UptimeRobot + Sentry | `MONITORING_MAINTENANCE.md` §1-2 |
| Something in production breaks | Rollback procedure | `DEPLOYMENT_SCRIPTS.md` §9 |
