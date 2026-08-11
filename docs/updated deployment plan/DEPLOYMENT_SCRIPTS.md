# SUPERSEDED BACKEND COMMANDS

The Docker/ECR commands in this document are retained only as historical
context. Use [`../AWS_LAMBDA_ZIP_DEPLOYMENT.md`](../AWS_LAMBDA_ZIP_DEPLOYMENT.md)
and the scripts under `portfolio-api/scripts/` for the current ZIP deployment.

# DEPLOYMENT SCRIPTS REFERENCE
**Version:** 2.0 (AWS backend) | **Last Updated:** 2026-07-15
**Purpose:** Concrete, copy-paste-and-adapt commands to execute the deployment described in `DEPLOYMENT_ARCHITECTURE.md`. Written to be handed directly to a coding agent — each section is a self-contained step with the exact CLI commands, config files, and verification checks.

**Read `DEPLOYMENT_ARCHITECTURE.md` first.** This doc assumes its component choices (Vercel + AWS Lambda + Supabase + Cloudflare) without re-justifying them.

---

## 0. Prerequisites

- [ ] AWS account, with the AWS CLI installed and configured (`aws configure` or SSO)
- [ ] Docker Desktop (or `docker` CLI) installed and running
- [ ] A GitHub repo for the backend (`portfolio-api`) and one for the frontend (`portfolio` or monorepo — adjust paths below accordingly)
- [ ] Supabase project already created (per `DATABASE_SCHEMA_REFERENCE.md` §12 migration checklist)
- [ ] A domain name, nameservers pointed at Cloudflare (or plan to use free `*.vercel.app` / Lambda's default Function URL domain — see note in `DEPLOYMENT_ARCHITECTURE.md` §3.5)
- [ ] Decide your AWS region once and use it consistently below — examples use `us-east-1`, substitute your own

---

## 1. Supabase Setup

Unchanged from the database docs — included here only for completeness of the deploy sequence:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Verify RLS is active on every table before continuing (per `DATABASE_REFERENCE.md` §10):

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 2. Backend: Build & Deploy to AWS Lambda

### 2.1 Modify the Dockerfile

Starting from the existing `Dockerfile` in `BACKEND_ARCHITECTURE.md` §16, add the Lambda Web Adapter layer and adjust for Lambda's execution model:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Lambda Web Adapter — lets this normal uvicorn app run inside Lambda unmodified
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 /lambda-adapter /opt/extensions/lambda-adapter

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY migrations/ migrations/

RUN mkdir -p logs

# Lambda Web Adapter reads these to know where your app is listening
# and which path to poll to confirm the app is ready to serve traffic —
# reuses the same endpoint the original Dockerfile's HEALTHCHECK used.
ENV PORT=8000
ENV AWS_LWA_READINESS_CHECK_PATH=/api/v1/health

# Note: the Docker-native HEALTHCHECK instruction from the original
# Dockerfile is removed — Lambda doesn't run `docker healthcheck`,
# and AWS_LWA_READINESS_CHECK_PATH above does the equivalent job.

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Check the current adapter image tag before building — `1.0.1` is current as of this doc's last update; confirm against `public.ecr.aws/awsguru/aws-lambda-adapter` or the [aws/aws-lambda-web-adapter releases page](https://github.com/aws/aws-lambda-web-adapter/releases) since this updates independently of your app.

### 2.2 Create the ECR repository

```bash
aws ecr create-repository \
  --repository-name portfolio-api \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true
```

Immediately attach a lifecycle policy to cap storage at one image (keeps the ECR cost asterisk from `DEPLOYMENT_ARCHITECTURE.md` §3.2 as close to zero as possible):

```bash
cat > ecr-lifecycle-policy.json << 'EOF'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only the most recent image",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 1
      },
      "action": { "type": "expire" }
    }
  ]
}
EOF

aws ecr put-lifecycle-policy \
  --repository-name portfolio-api \
  --region us-east-1 \
  --lifecycle-policy-text file://ecr-lifecycle-policy.json
```

### 2.3 Build and push the image

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
REPO_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/portfolio-api

aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

docker build --platform linux/amd64 -t portfolio-api .
docker tag portfolio-api:latest ${REPO_URI}:latest
docker push ${REPO_URI}:latest
```

`--platform linux/amd64` matters if you're building on Apple Silicon — Lambda's x86_64 architecture needs an explicitly-targeted build or the function will fail to start.

### 2.4 Create the IAM execution role

Minimal permissions — CloudWatch Logs only, nothing else, per the security checklist in `DEPLOYMENT_ARCHITECTURE.md` §6:

```bash
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name portfolio-api-lambda-role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name portfolio-api-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 2.5 Create the Lambda function

```bash
ROLE_ARN=$(aws iam get-role --role-name portfolio-api-lambda-role --query 'Role.Arn' --output text)

aws lambda create-function \
  --function-name portfolio-api \
  --package-type Image \
  --code ImageUri=${REPO_URI}:latest \
  --role $ROLE_ARN \
  --timeout 10 \
  --memory-size 512 \
  --region $REGION \
  --environment "Variables={
    SUPABASE_URL=https://your-project.supabase.co,
    SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME,
    RESEND_API_KEY=REPLACE_ME,
    CONTACT_NOTIFICATION_EMAIL=you@yourdomain.com,
    ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  }"
```

`--timeout 10` and `--memory-size 512` directly implement the cost-safety guardrails from `DEPLOYMENT_ARCHITECTURE.md` §3.8 — don't raise these casually.

Set the environment variables that actually hold secrets via the console or a secrets-aware CLI call instead of plaintext in your shell history for anything beyond local testing — see §8 below.

### 2.6 Cap reserved concurrency (mandatory guardrail)

```bash
aws lambda put-function-concurrency \
  --function-name portfolio-api \
  --reserved-concurrent-executions 5
```

### 2.7 Create the Function URL (no API Gateway)

```bash
aws lambda create-function-url-config \
  --function-name portfolio-api \
  --auth-type NONE \
  --cors '{
    "AllowOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "AllowMethods": ["GET", "POST", "OPTIONS"],
    "AllowHeaders": ["content-type"]
  }'

aws lambda get-function-url-config --function-name portfolio-api --query 'FunctionUrl' --output text
```

Save the returned URL (`https://<url-id>.lambda-url.<region>.on.aws/`) — you'll point Cloudflare at it in §4 and set it as `NEXT_PUBLIC_API_URL` in Vercel (or the `api.yourdomain.com` equivalent once DNS is live) in §3.

### 2.8 Verify

```bash
curl https://<url-id>.lambda-url.us-east-1.on.aws/api/v1/health
# Expect: {"status":"healthy","version":"1.0.0","database":"ok"}
```

If this is slow (several seconds) on the first call, that's the cold start described in `DEPLOYMENT_ARCHITECTURE.md` §4 — expected, not a bug.

---

## 3. Frontend: Deploy to Vercel

1. Push the frontend repo to GitHub if not already there.
2. In the Vercel dashboard: **Add New → Project → Import Git Repository**, select the repo.
3. Framework preset: Next.js (auto-detected).
4. Environment variables (Production + Preview, per `.env.example` in `FRONTEND_ARCHITECTURE.md` §5):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` (or the raw Lambda Function URL until DNS is wired) |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase project settings |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | if used |
| `NEXT_PUBLIC_SENTRY_DSN` | from Sentry project settings, see `MONITORING_MAINTENANCE.md` §2 |

5. Deploy. Vercel auto-builds and gives you a `*.vercel.app` preview URL immediately — confirm the site renders before moving to DNS.

---

## 4. DNS: Point Your Domain at Both Services

All in Cloudflare (assuming your domain's nameservers are already delegated to Cloudflare):

| Record type | Name | Target | Proxy status |
|---|---|---|---|
| `CNAME` | `@` (or `A`/`ALIAS` per Vercel's current instructions) | `cname.vercel-dns.com` | DNS-only (grey cloud) — Vercel needs to see the real request for its own TLS/cert issuance |
| `CNAME` | `www` | `cname.vercel-dns.com` | DNS-only (grey cloud) |
| `CNAME` | `api` | `<url-id>.lambda-url.us-east-1.on.aws` | **Proxied (orange cloud)** — this is what gives you TLS + a clean domain in front of the Function URL, per `DEPLOYMENT_ARCHITECTURE.md` §3.5 |

Then in Vercel: **Project Settings → Domains → Add** `yourdomain.com` and `www.yourdomain.com`, follow Vercel's verification (it will tell you if any DNS record needs adjusting — Vercel's exact required record type occasionally changes, follow what the dashboard shows over this table if they conflict).

Update `NEXT_PUBLIC_API_URL` in Vercel to `https://api.yourdomain.com` once the `api` CNAME resolves, and update the Lambda Function URL's CORS config (§2.7) if you haven't already pointed it at the final domain.

---

## 5. GitHub Actions: Keep-Alive + Backup (Supabase)

This single scheduled workflow solves two problems at once: Supabase's 7-day inactivity pause, and the lack of automatic backups on the free tier.

**File: `.github/workflows/keepalive-backup.yml`**

```yaml
name: Supabase Keep-Alive & Backup

on:
  schedule:
    - cron: "0 3 */3 * *"  # every 3 days at 03:00 UTC
  workflow_dispatch: {}      # allow manual trigger too

jobs:
  keepalive-and-backup:
    runs-on: ubuntu-latest
    steps:
      - name: Ping backend health endpoint (keeps Supabase active)
        run: curl -f https://api.yourdomain.com/api/v1/health

      - name: Install Postgres client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client

      - name: Dump database
        env:
          PGPASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          pg_dump -h ${{ secrets.SUPABASE_DB_HOST }} \
                  -U postgres \
                  -d postgres \
                  -Fc -f backup-$(date +%Y%m%d).dump

      - name: Push backup to private backup repo
        env:
          GH_TOKEN: ${{ secrets.BACKUP_REPO_TOKEN }}
        run: |
          git clone https://x-access-token:${GH_TOKEN}@github.com/yourhandle/portfolio-backups.git
          cp backup-*.dump portfolio-backups/
          cd portfolio-backups
          # Keep only the last 10 backups to bound repo size
          ls -t backup-*.dump | tail -n +11 | xargs -r rm --
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git add .
          git commit -m "Automated backup $(date +%Y-%m-%d)" || echo "No changes"
          git push
```

Notes:
- `portfolio-backups` should be a **separate, private** GitHub repo (backups of production data shouldn't live in the same repo as application code and its PR history).
- `BACKUP_REPO_TOKEN` is a fine-grained GitHub PAT scoped only to that one backup repo, `contents: write` — not a broad personal token.
- `SUPABASE_DB_HOST`/`SUPABASE_DB_PASSWORD` come from Supabase project settings → Database → Connection info.
- Every 3 days keeps well clear of Supabase's 7-day pause window even if a run occasionally fails.

---

## 6. GitHub Actions: CD for the Backend (OIDC, No Static AWS Keys)

### 6.1 One-time AWS setup — OIDC identity provider + IAM role

```bash
# Register GitHub's OIDC provider with AWS (once per AWS account)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

cat > github-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:yourhandle/portfolio-api:ref:refs/heads/main" }
    }
  }]
}
EOF
# Replace ACCOUNT_ID with your account ID, and the repo/branch in StringLike

aws iam create-role \
  --role-name github-actions-deploy-portfolio-api \
  --assume-role-policy-document file://github-trust-policy.json

# Narrow permissions: push to this one ECR repo, update this one Lambda function
cat > deploy-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ecr:BatchCheckLayerAvailability", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"],
      "Resource": "arn:aws:ecr:us-east-1:ACCOUNT_ID:repository/portfolio-api"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:UpdateFunctionCode", "lambda:GetFunction"],
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:portfolio-api"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name github-actions-deploy-portfolio-api \
  --policy-name deploy-permissions \
  --policy-document file://deploy-policy.json
```

### 6.2 The workflow

**File: `.github/workflows/deploy-backend.yml`**

```yaml
name: Deploy Backend to Lambda

on:
  push:
    branches: [main]
    paths: ["app/**", "Dockerfile", "requirements.txt"]

permissions:
  id-token: write   # required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-deploy-portfolio-api
          aws-region: us-east-1

      - name: Login to ECR
        run: |
          aws ecr get-login-password --region us-east-1 | \
            docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

      - name: Build and push image
        run: |
          docker build --platform linux/amd64 -t portfolio-api .
          docker tag portfolio-api:latest ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/portfolio-api:latest
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/portfolio-api:latest

      - name: Update Lambda function
        run: |
          aws lambda update-function-code \
            --function-name portfolio-api \
            --image-uri ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/portfolio-api:latest \
            --publish
```

Only `AWS_ACCOUNT_ID` needs to be a GitHub Secret — it's not sensitive on its own, but keeping it out of the workflow file avoids hardcoding an account-specific value into version-controlled YAML. No AWS access key or secret key exists anywhere in this pipeline.

### 6.3 CI (lint + test, per `CODE_STYLE_GIT_WORKFLOW.md` §5)

**File: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  backend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt -r requirements-dev.txt --break-system-packages
      - run: black --check app/
      - run: ruff check app/
      - run: pytest -v

  frontend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm build
```

---

## 7. AWS Budgets + Final Guardrail Verification (One-Time, Console)

These are quick console steps, deliberately not automated — you want to see the confirmation screens yourself for something this important:

1. **Billing and Cost Management console → Budgets → Create budget.**
2. **Use a template (simplified) → Zero spend budget.**
3. Confirm the alert email address, create it.
4. Separately, in **Billing preferences**, opt in to **"Receive AWS Free Tier alerts"** (an additional, free, automatic layer — notifies at 85% of any free-tier limit, not just $0 spend).
5. Verify reserved concurrency is actually applied: `aws lambda get-function-concurrency --function-name portfolio-api` should return `5` (or whatever you set).
6. Verify no VPC is attached: `aws lambda get-function-configuration --function-name portfolio-api --query 'VpcConfig'` should return an empty/null config.

Do this **before** putting the Function URL or custom domain anywhere public.

---

## 8. Secrets & Environment Variables Checklist

| Secret | Lives in | Never appears in |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Lambda environment variables (console or `aws lambda update-function-configuration`) | Frontend env vars, Docker image, git history |
| `RESEND_API_KEY` | Lambda environment variables | Same as above |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel environment variables | This one is *meant* to be public (it's the anon key) — fine in frontend bundle |
| `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_HOST` | GitHub Secrets (repo settings → Secrets and variables → Actions) | Workflow YAML files, logs |
| `BACKUP_REPO_TOKEN` | GitHub Secrets | Same as above |
| `AWS_ACCOUNT_ID` | GitHub Secrets | Fine either way, kept as a secret for hygiene only |
| — no AWS access key/secret key exists anywhere — | OIDC role assumption instead | N/A |

---

## 9. Post-Deploy Verification Checklist

- [ ] `curl https://api.yourdomain.com/api/v1/health` returns `200` with `"status":"healthy"`
- [ ] Contact form on the live site submits successfully and a row appears in Supabase `messages`
- [ ] Notification email arrives via Resend
- [ ] Rate limit triggers correctly after 5 submissions in an hour (`API_CONTRACTS.md` §7)
- [ ] CORS: a request from a non-allowed origin is rejected (test with `curl -H "Origin: https://evil.com"`)
- [ ] `aws lambda get-function-concurrency --function-name portfolio-api` confirms reserved concurrency is set
- [ ] AWS Budgets Zero-Spend alert is active (check the Budgets console shows "Alert configured")
- [ ] UptimeRobot and Sentry are receiving data (see `MONITORING_MAINTENANCE.md`)
- [ ] `keepalive-backup.yml` has run at least once successfully (check the Actions tab)

---

## 10. Rollback Procedure

**Frontend (Vercel):** Vercel dashboard → Deployments → find the last known-good deployment → **Promote to Production**. Instant, no rebuild needed.

**Backend (Lambda):** Every `update-function-code --publish` creates a new immutable version. To roll back:

```bash
# List recent versions
aws lambda list-versions-by-function --function-name portfolio-api \
  --query 'Versions[*].[Version,LastModified]' --output table

# Point the function back at a known-good version's image
aws lambda update-function-code \
  --function-name portfolio-api \
  --image-uri <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/portfolio-api@<sha256-digest-of-good-version>
```

(Get the digest from `aws lambda get-function --function-name portfolio-api --qualifier <good-version-number>`.)

**Database:** Restore from the most recent `.dump` file in the `portfolio-backups` repo:

```bash
pg_restore -h <supabase-db-host> -U postgres -d postgres -c backup-YYYYMMDD.dump
```

Use `-c` (clean) with care — it drops existing objects before recreating them from the dump. Confirm you're restoring into the right database first.
