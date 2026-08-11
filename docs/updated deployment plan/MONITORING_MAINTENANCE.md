# MONITORING & MAINTENANCE REFERENCE
**Version:** 1.0 (AWS backend) | **Last Updated:** 2026-07-15
**Purpose:** How to know when something breaks, how to keep the free tiers from quietly expiring, and what to check on a recurring schedule. Companion to `DEPLOYMENT_ARCHITECTURE.md` and `DEPLOYMENT_SCRIPTS.md` — read those first for what's deployed where.

---

## 1. Uptime Monitoring — UptimeRobot (Free)

**Setup:**
1. Create a free UptimeRobot account (50 monitors, 5-minute check interval on the free tier).
2. Add two HTTP(S) monitors:
   - `https://yourdomain.com` — catches Vercel/frontend issues
   - `https://api.yourdomain.com/api/v1/health` — catches Lambda/Supabase issues, and specifically checks the `database` field in the response, not just a 200 status
3. Set alert contacts to your email (and optionally a free Slack/Discord webhook if you want push notifications instead of email).
4. **Do not** set the interval below 5 minutes to try to keep Lambda "warm" — that's not what this monitor is for (see §5 for the actual keep-alive mechanism), and overly aggressive polling of a public endpoint just adds noise to your CloudWatch Logs and Sentry data for no benefit, since Lambda doesn't have a Render-style sleep state to fight.

**What "down" looks like for each:**
- Frontend down: Vercel outage (rare) or a bad deploy — check Vercel dashboard, roll back per `DEPLOYMENT_SCRIPTS.md` §10.
- API down: check CloudWatch Logs (§3 below) for the Lambda function first, then Supabase status, then Resend status.

---

## 2. Error Tracking — Sentry (Free, Developer Plan)

Free tier: 5,000 error events/month, 1 user, 30-day retention — comfortably enough for a solo project's traffic.

### 2.1 Frontend (Next.js)

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

The wizard configures `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. Key setting to change from the wizard's default: **disable performance monitoring / tracing** (`tracesSampleRate: 0`) so the free quota is spent entirely on actual errors, not transaction sampling — a portfolio site doesn't need APM-style tracing, and letting tracing eat the 5K/month budget means real errors get silently dropped once the quota's gone.

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,       // errors only, preserve the free quota
  replaysSessionSampleRate: 0, // session replay also counts against quota — skip it
});
```

### 2.2 Backend (FastAPI on Lambda)

```bash
pip install --break-system-packages sentry-sdk[fastapi]
```

```python
# app/main.py — add near the top, before the FastAPI() instantiation
import sentry_sdk
from app.core.config import get_settings

settings = get_settings()
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0,   # same reasoning as frontend — errors only
        environment="production",
    )
```

`sentry_dsn` already exists as a config field in `BACKEND_ARCHITECTURE.md` §3 — just needs a real value set as a Lambda environment variable (per `DEPLOYMENT_SCRIPTS.md` §8).

### 2.3 Rate-limit your own quota

At 5,000 events/month, one noisy recurring error can quietly burn the whole month's budget before you notice, per the general Sentry free-tier caveat: events beyond the quota are silently dropped, not queued. Add inbound filters in the Sentry project settings to drop known-noisy, non-actionable sources (browser extension errors, bot/crawler user agents) so the quota is spent on errors that are actually yours to fix.

---

## 3. Backend Logs — CloudWatch Logs

Lambda writes stdout/stderr to CloudWatch Logs automatically via the `AWSLambdaBasicExecutionRole` permission already attached in `DEPLOYMENT_SCRIPTS.md` §2.4 — no extra setup needed to start seeing logs. Two things worth doing once:

**Cap retention (cost hygiene, not urgent but easy):**

```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/portfolio-api \
  --retention-in-days 7
```

Lambda's default is indefinite retention. At this project's log volume the storage cost either way is a rounding error, but capping it removes one more thing that could theoretically grow unbounded over years.

**Quick log tail during/after a deploy:**

```bash
aws logs tail /aws/lambda/portfolio-api --follow
```

**Structured log queries (CloudWatch Logs Insights)** — useful once you have a few weeks of data, e.g. to find every 500 error in the last 24 hours:

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

---

## 4. AWS Cost Monitoring — the Guardrails from `DEPLOYMENT_SCRIPTS.md` §7, Recap

These were set up once during deployment; this section is what to actually *check* periodically:

| What | Where to check | Frequency |
|---|---|---|
| Zero-Spend Budget alert status | Billing and Cost Management → Budgets | Passive — it emails you, no need to check unless you get an email |
| Free Tier usage (%) across all services | Billing and Cost Management → Free Tier page | Monthly (§6) |
| Reserved concurrency still set to 5 | `aws lambda get-function-concurrency --function-name portfolio-api` | After any manual console changes to the function |
| No VPC attached | `aws lambda get-function-configuration --function-name portfolio-api --query VpcConfig` | After any manual console changes |
| ECR storage size | `aws ecr describe-images --repository-name portfolio-api --query 'imageDetails[*].imageSizeInBytes'` | Monthly, should always show exactly 1 image thanks to the lifecycle policy |

If you ever *do* get a Zero-Spend Budget alert email: don't panic, but don't ignore it either — go straight to Billing and Cost Management → Cost Explorer, filter by service, and find which line item moved. The most likely causes, in order of likelihood for this specific architecture: (1) ECR storage crept past the lifecycle policy somehow, (2) reserved concurrency got reset by a console change, (3) something attached a VPC. All three are checkable with the commands in the table above.

---

## 5. Supabase Keep-Alive & Backups

Implemented as the single GitHub Actions workflow in `DEPLOYMENT_SCRIPTS.md` §5 (`keepalive-backup.yml`), running every 3 days. This section is what to verify periodically, not how to set it up:

- [ ] Check the Actions tab shows green runs on schedule — a silently-failing cron job is worse than no cron job, since it creates false confidence
- [ ] Spot-check the `portfolio-backups` private repo has recent `.dump` files
- [ ] Once a quarter, actually test a restore against a local/throwaway Postgres instance — a backup you've never restored from is a hypothesis, not a backup

**Why 3 days, not weekly:** Supabase's free-tier pause triggers after 7 days of zero API requests. A 3-day cadence leaves comfortable margin even if one scheduled run fails silently (GitHub Actions cron can occasionally run a few minutes late during high platform load, never days late — but 3-day margin against a 7-day trigger is deliberately generous).

---

## 6. Maintenance Calendar

| Cadence | Task |
|---|---|
| **Weekly** | Skim Sentry for new error types (not volume — a new *kind* of error matters more than a count) |
| **Weekly** | Confirm UptimeRobot shows no unexplained downtime |
| **Monthly** | Check AWS Free Tier usage page — confirm Lambda requests/GB-seconds are nowhere near the 1M/400K ceiling (they won't be, but confirm rather than assume) |
| **Monthly** | Check Supabase usage dashboard (database size, egress) against the 500MB/5GB free-tier ceilings |
| **Monthly** | Check Resend usage against the 3,000/month ceiling |
| **Quarterly** | Test a database restore from the automated backup (see §5) |
| **Quarterly** | Rotate `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` if either has been visible in a shared context (screen share, pairing session, etc.) — not required on a fixed schedule otherwise, but worth a deliberate quarterly check-in |
| **Quarterly** | Re-read the current pricing/free-tier pages for Vercel, AWS Lambda, Supabase, and Resend — free tiers get restructured periodically (as this doc's own research process found happening mid-2026 for several of these services), and a quarterly check is cheap insurance against a silent, unannounced change |
| **As needed** | Adjust Sentry inbound filters if a specific noisy error source starts eating quota |

---

## 7. Incident Mini-Runbook (Solo Maintainer)

Not a full on-call process — just the order of operations when something's actually down:

1. **Confirm it's real.** Check UptimeRobot's status page, not just the alert email (rules out a one-off transient blip).
2. **Isolate the layer.** `curl https://api.yourdomain.com/api/v1/health` — if this fails but `https://yourdomain.com` loads fine, it's backend/database, not frontend.
3. **Check the obvious first.** CloudWatch Logs tail (§3), then Sentry, then Supabase's own status page, then Resend's.
4. **If it's a bad deploy:** roll back immediately per `DEPLOYMENT_SCRIPTS.md` §10, diagnose after the site is back up, not before.
5. **If it's a cost/quota issue** (Free Tier alert, Supabase paused, Resend daily cap hit): these fail loudly and specifically enough that the fix is usually obvious from the alert itself — resume the Supabase project from its dashboard, wait for the daily Resend cap to reset, etc.
6. **Write down what happened**, even just a one-line note in the repo's `README.md` or an issue — a solo maintainer's memory is the only incident database this project has.

---

## Quick Reference

| Signal | First place to look |
|---|---|
| Site won't load at all | Vercel dashboard → Deployments |
| Contact form fails | CloudWatch Logs (`aws logs tail /aws/lambda/portfolio-api --follow`) |
| Contact form times out / very slow | Expected on first request after idle (cold start) — check if it resolves on retry before treating as an incident |
| No email arrives after contact form | Resend dashboard → check daily/monthly quota, check delivery logs |
| "Project paused" from Supabase | Check `keepalive-backup.yml` run history — the keep-alive job likely failed silently |
| Unexpected AWS Budget alert | Cost Explorer, filtered by service — see §4 |
| New error type in Sentry | Check if it's a real bug vs. a noisy third-party/bot source worth filtering |
