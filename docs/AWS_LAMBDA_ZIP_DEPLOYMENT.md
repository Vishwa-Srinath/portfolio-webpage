# AWS Lambda ZIP Deployment for the Portfolio API

Last verified: 2026-08-11

This is the current deployment runbook for the FastAPI backend. It replaces the
older Docker/ECR plan with a ZIP-based Lambda function, Mangum, and a Lambda
Function URL.

## What this repository now provides

- `portfolio-api/lambda_handler.py` — Lambda handler (`lambda_handler.handler`)
- `portfolio-api/requirements-lambda.txt` — deployment-only Mangum dependency
- `portfolio-api/scripts/build_lambda_zip.sh` — reproducible Python 3.12/x86_64 ZIP build
- `portfolio-api/scripts/deploy_lambda.sh` — first deployment and later configuration updates
- `portfolio-api/scripts/setup_github_oidc.sh` — least-privilege GitHub Actions authentication
- `portfolio-api/scripts/create_cost_budget.sh` — alerts at USD 0.01, USD 0.50, and USD 1.00
- `.github/workflows/deploy-backend.yml` — automatic ZIP deployments from `main`

The local backend still runs normally with Uvicorn. No API routes, schemas,
database design, or frontend design were changed.

## Important cost facts

Lambda Function URLs have no endpoint-specific charge; requests and execution
time use normal Lambda pricing. The Lambda free tier currently includes 1
million requests and 400,000 GB-seconds each month. ZIP code is stored in
Lambda-managed storage, so no ECR repository is required.

Current Lambda ZIP limits are:

- 50 MB compressed when uploaded directly through the CLI/API or console
- 250 MB uncompressed, including layers
- 300 GB total Lambda-managed ZIP/layer code storage per Region/account
- 4 KB total Lambda environment-variable configuration
- 6 MB synchronous request and response payloads

Official references:

- <https://aws.amazon.com/lambda/pricing/>
- <https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html>
- <https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-zip.html>
- <https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html>

### Honest zero-dollar warning

This design has no fixed monthly AWS resource fee and should remain within the
Lambda free tier for a normal portfolio. A public pay-as-you-go AWS endpoint can
never be guaranteed to cost exactly USD 0 under every traffic/abuse scenario.
AWS Budgets is delayed monitoring, not a real-time hard cap. The included
guardrails minimize risk:

- no ECR, API Gateway, NAT Gateway, VPC, provisioned concurrency, or paid layer
- 256 MB memory and 15-second timeout
- reserved concurrency of 2 where the account quota permits it
- seven-day CloudWatch log retention
- in-application input validation and rate limiting
- budget alerts beginning at one cent of actual AWS account spend

Do not enable provisioned concurrency or attach this Lambda to a VPC/NAT Gateway.

For additional public-endpoint protection, an eligible AWS paid account can put
CloudFront's USD 0 flat-rate Free plan and its included WAF in front of the
Function URL. That plan currently includes 1 million requests, 100 GB transfer,
rate limiting, WAF, and no CloudFront overage charges. It does not turn Lambda
compute itself into a hard-capped service. AWS Free Tier account plans cannot
subscribe to CloudFront flat-rate plans.

## 1. Prerequisites

The following must be installed locally:

```bash
aws --version
python3 --version
zip -v | head -1
```

Authenticate the AWS CLI using an IAM administrator role or IAM Identity Center,
not the AWS root user:

```bash
aws configure
aws sts get-caller-identity
```

The deployment identity needs Lambda, IAM role/pass-role, CloudWatch Logs, OIDC,
and Budgets permissions for first-time setup. A scoped starting policy is provided
at `portfolio-api/infra/aws-bootstrap-policy.json`. Have an AWS administrator
attach it to the IAM user/role that runs the bootstrap, then verify:

```bash
aws lambda get-account-settings --region us-east-1
```

If this returns `AccessDeniedException`, stop and correct IAM before deployment.
Do not compensate by using permanent root-user access keys.

This repository currently defaults to `us-east-1`. To use another Region, export
it before every setup command:

```bash
export AWS_REGION=ap-south-1
```

Use one Region consistently. Python 3.12 is intentionally used because it is an
Amazon Linux 2023 Lambda runtime supported through 2028 and matches the project's
existing deployment target.

## 2. Prepare production environment variables

From the repository root:

```bash
cd portfolio-api
cp .env.lambda.example .env.lambda
chmod 600 .env.lambda
```

Edit `.env.lambda` and replace every placeholder. At minimum, set:

```dotenv
DEBUG=false
ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app,http://localhost:3000
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
CONTACT_NOTIFICATION_EMAIL=YOUR_EMAIL_ADDRESS
```

If the contact form should send notifications, also set:

```dotenv
RESEND_API_KEY=YOUR_RESEND_KEY
SMTP_FROM_EMAIL=verified-sender@yourdomain.com
```

Notes:

- Never commit `.env.lambda`; it is ignored by git.
- `ALLOWED_ORIGINS` must contain the exact browser origin, without a trailing slash.
- Keep `http://localhost:3000` only if you want the deployed API callable from local development.
- The service-role key is server-side only. Never put it in Vercel or a `NEXT_PUBLIC_*` variable.
- Lambda environment variables are encrypted at rest by AWS's default managed key, but IAM principals with configuration-read permission can view them.

Validate the file without printing secret values:

```bash
python3 scripts/render_lambda_environment.py \
  .env.lambda /tmp/portfolio-lambda-env-check.json
rm -f /tmp/portfolio-lambda-env-check.json
```

## 3. Build and inspect the ZIP

From `portfolio-api/`:

```bash
./scripts/build_lambda_zip.sh
unzip -l dist/portfolio-api-lambda.zip | head
```

The script:

1. Installs wheels for CPython 3.12, Linux x86_64/manylinux2014.
2. Copies `app/` and `lambda_handler.py` to the ZIP root.
3. Removes Python caches.
4. Refuses artifacts over Lambda's direct-upload and uncompressed limits.

The handler is:

```text
lambda_handler.handler
```

Do not set it to `main.handler`; this repository's FastAPI app lives in
`app/main.py`, while the AWS adapter intentionally lives in the root-level
`lambda_handler.py`.

## 4. First deployment

From `portfolio-api/`:

```bash
AWS_REGION=us-east-1 \
FUNCTION_NAME=portfolio-api \
ENV_FILE="$PWD/.env.lambda" \
./scripts/deploy_lambda.sh
```

The script performs these idempotent operations:

1. Builds the ZIP.
2. Creates `portfolio-api-lambda-role` if missing.
3. Attaches only `AWSLambdaBasicExecutionRole` for CloudWatch logs.
4. Creates or updates a Python 3.12/x86_64 ZIP Lambda.
5. Publishes an immutable function version.
6. Attempts to cap reserved concurrency at 2.
7. Sets CloudWatch log retention to seven days.
8. Creates a public Function URL with `AuthType=NONE`.
9. Adds both public Function URL permissions required for new URLs since October 2025.
10. Calls `/api/v1/health` and fails if the smoke test is not healthy.

If an existing `portfolio-api` function uses a container image, AWS cannot
convert it to ZIP in place. Deploy the ZIP under a new name:

```bash
FUNCTION_NAME=portfolio-api-zip ./scripts/deploy_lambda.sh
```

After the frontend has switched to the new URL and is verified, delete the old
image Lambda and ECR repository from the AWS console to remove ECR storage costs.

Expected final output includes:

```text
Deployment complete
Function: portfolio-api
URL:      https://...lambda-url.us-east-1.on.aws/
Health:   https://...lambda-url.us-east-1.on.aws/api/v1/health
```

Verify all read-only paths:

```bash
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name portfolio-api \
  --region us-east-1 \
  --query FunctionUrl \
  --output text)

curl -f "${FUNCTION_URL}api/v1/health"
curl -f "${FUNCTION_URL}api/v1/profile"
curl -f "${FUNCTION_URL}api/v1/content"
curl -f "${FUNCTION_URL}docs"
```

Expected health response:

```json
{"status":"healthy","version":"1.0.0","database":"ok"}
```

Do not submit test contact messages to production unless you want a real database
row and email notification.

## 5. Connect the frontend

Set this Vercel project environment variable for Production and Preview:

```text
NEXT_PUBLIC_API_URL=https://YOUR-ID.lambda-url.us-east-1.on.aws
```

Use the base URL without a trailing slash. Redeploy the frontend after changing
the variable. Then update `.env.lambda` so `ALLOWED_ORIGINS` includes the final
Vercel/custom-domain origin and run `deploy_lambda.sh` once more.

Browser verification:

1. Open the deployed portfolio.
2. Open browser developer tools, then Network.
3. Submit one intentional contact message.
4. Confirm `POST /api/v1/contact` returns 200.
5. Confirm the row appears in Supabase and the Resend email arrives.

## 6. Create cost alerts before sharing the URL

```bash
cd portfolio-api
BUDGET_EMAIL=you@example.com ./scripts/create_cost_budget.sh
```

This creates a USD 1 monthly account-level budget with actual-spend alerts at:

- 1% = USD 0.01
- 50% = USD 0.50
- 100% = USD 1.00

Confirm the subscription email if AWS asks. Also open **Billing and Cost
Management → Budgets** and create the AWS **Zero spend budget** template if your
account offers it. Budget data may be delayed by hours, so inspect the Billing
dashboard after the first deployment and again the next day.

Check the concurrency guardrail:

```bash
aws lambda get-function-concurrency \
  --function-name portfolio-api \
  --region us-east-1
```

Reserved concurrency is free. Provisioned concurrency is not free and must remain disabled.

## 7. Configure automatic GitHub deployments with OIDC

The workflow uses short-lived GitHub OIDC credentials. Do not store AWS access
keys in GitHub.

First determine the GitHub repository's exact `owner/name`, then run:

```bash
cd portfolio-api
GITHUB_REPOSITORY=Vishwa-Srinath/portfolio-webpage \
GITHUB_BRANCH=main \
FUNCTION_NAME=portfolio-api \
AWS_REGION=us-east-1 \
./scripts/setup_github_oidc.sh
```

The script prints a role ARN. In GitHub open:

**Repository → Settings → Secrets and variables → Actions → Variables**

Create these repository variables:

| Variable | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | ARN printed by `setup_github_oidc.sh` |
| `AWS_REGION` | `us-east-1` |
| `LAMBDA_FUNCTION_NAME` | `portfolio-api` |

The role trust policy is restricted to the named repository, `main` branch, and
`sts.amazonaws.com` audience. Its inline policy can update/publish only this one
Lambda function. The workflow never receives permission to read Lambda environment
variables or edit IAM.

Test it from GitHub:

1. Open **Actions → Deploy Backend ZIP to AWS Lambda**.
2. Choose **Run workflow**.
3. Confirm the build, OIDC authentication, update, and smoke-test steps pass.

Future changes under `portfolio-api/app/`, the Lambda handler, requirements, or
build script deploy automatically after a push to `main`.

## 8. Normal updates

For a manual code/configuration deployment:

```bash
cd portfolio-api
./scripts/deploy_lambda.sh
```

For a code-only GitHub deployment, merge to `main` or manually run the workflow.

When environment values change, use the local deploy script because the GitHub
role deliberately cannot read or update production secrets.

## 9. Logs and troubleshooting

Tail logs:

```bash
aws logs tail /aws/lambda/portfolio-api \
  --region us-east-1 \
  --since 30m \
  --follow
```

Common failures:

| Symptom | Cause and fix |
|---|---|
| 403 from Function URL | Both URL resource-policy statements are missing; rerun `deploy_lambda.sh`. |
| 400 Invalid host header | Function has old code without regional Lambda hostname support; redeploy ZIP. |
| Import/module error | ZIP was not built for Python 3.12 x86_64 or handler is wrong; rebuild with the included script. |
| Read-only filesystem error | Old logging code attempted to create `logs/`; deploy current code. |
| Health is degraded | Verify Supabase URL/key values and that the project is active. |
| Browser CORS error | Add the exact frontend origin to `ALLOWED_ORIGINS`, then redeploy configuration. |
| Contact stores but email fails | Verify `RESEND_API_KEY`, verified sender, and notification address. |
| Reserved concurrency command fails | New accounts may have reduced concurrency; view `aws lambda get-account-settings`. |
| ZIP exceeds 50 MB | Remove unused dependencies or use a Lambda layer/S3 upload; do not switch back to ECR solely for this. |

## 10. Rollback

List published versions:

```bash
aws lambda list-versions-by-function \
  --function-name portfolio-api \
  --region us-east-1 \
  --query 'Versions[].{Version:Version,Modified:LastModified,Description:Description}'
```

The raw Function URL points to `$LATEST`, so the simplest rollback is to redeploy
the known-good Git commit:

```bash
git switch --detach KNOWN_GOOD_COMMIT
cd portfolio-api
./scripts/deploy_lambda.sh
git switch -
```

This leaves published versions available for auditing while restoring `$LATEST`.

## 11. Remove everything if you stop using AWS

These commands are destructive. Resolve and verify the names first:

```bash
aws lambda get-function --function-name portfolio-api --region us-east-1
aws iam get-role --role-name portfolio-api-lambda-role
```

Then remove the Lambda resources:

```bash
aws lambda delete-function-url-config \
  --function-name portfolio-api \
  --region us-east-1

aws lambda delete-function \
  --function-name portfolio-api \
  --region us-east-1

aws logs delete-log-group \
  --log-group-name /aws/lambda/portfolio-api \
  --region us-east-1

aws iam detach-role-policy \
  --role-name portfolio-api-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam delete-role --role-name portfolio-api-lambda-role
```

Delete the GitHub deployment role only if no workflow uses it:

```bash
aws iam delete-role-policy \
  --role-name github-actions-deploy-portfolio-api-zip \
  --policy-name DeployPortfolioLambdaZip

aws iam delete-role \
  --role-name github-actions-deploy-portfolio-api-zip
```

Do not delete the account-wide GitHub OIDC provider if other repositories use it.

If an obsolete ECR repository exists, inspect it before deletion:

```bash
aws ecr describe-repositories --repository-names portfolio-api --region us-east-1
aws ecr list-images --repository-name portfolio-api --region us-east-1
```

Only after confirming it is unused:

```bash
aws ecr delete-repository \
  --repository-name portfolio-api \
  --region us-east-1 \
  --force
```
