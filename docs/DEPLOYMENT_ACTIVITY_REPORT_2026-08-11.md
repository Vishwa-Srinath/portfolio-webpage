# Deployment Architecture & Activity Report

**Date:** August 11, 2026  
**Project:** Portfolio Web Platform

## Executive Summary

Successfully engineered and deployed a 100% zero-cost, serverless backend architecture on AWS Lambda. The deployment strictly utilizes ZIP archives and native Lambda Function URLs to bypass standard container registry (ECR) and API Gateway fees. A fully automated, passwordless CI/CD pipeline was established via GitHub Actions, and the Next.js frontend was successfully integrated for local development.

## 1. Serverless Backend Infrastructure (AWS)

The Python FastAPI backend was transitioned from local development to a production-grade AWS environment.

- **Compute:** Deployed to AWS Lambda utilizing the Python 3.12 runtime.
- **Adapter:** Implemented `mangum` to translate AWS Lambda execution events into standard ASGI requests for FastAPI.
- **Routing:** Exposed the API via an explicitly public AWS Lambda Function URL, establishing a direct HTTPS endpoint without the overhead of Amazon API Gateway.
- **Deployment Methodology:** Packaged the application and its dependencies (under the 250 MB limit) into a ZIP archive (`portfolio-api-lambda.zip`) via the `build_lambda_zip.sh` script, eliminating the need for Docker containers and associated Private Amazon ECR storage costs.

## 2. Database Integration & Security (Supabase)

Database connectivity was secured without relying on paid secrets management services.

- **Credentials:** Injected `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` directly into the Lambda runtime environment via `.env.lambda`.
- **Encryption:** Environment variables remain encrypted at rest by AWS KMS natively.
- **CORS Configuration:** Configured the `ALLOWED_ORIGINS` environment variable to strictly permit API requests from `http://localhost:3000` (with capacity to append the live `.vercel.app` domain upon frontend deployment). Preflight `OPTIONS` requests were successfully validated.

## 3. Automated CI/CD Pipeline (GitHub Actions)

Established a continuous integration and continuous deployment pipeline to completely automate future backend updates.

- **Authentication:** Configured an AWS IAM Identity Provider for GitHub OIDC (OpenID Connect) via `setup_github_oidc.sh`. This ensures GitHub Actions receives temporary, short-lived tokens to update infrastructure, eliminating the security risk of storing permanent AWS access keys in GitHub Secrets.
- **Workflow (`deploy-backend.yml`):** The pipeline is configured to automatically trigger upon pushes to the `main` branch, exclusively when files within the `portfolio-api/` directory are modified.
- **Quality Gates:** The pipeline strictly enforces a passing **CI — Lint, Type-check & Test** job before authorizing the AWS deployment step.

## 4. Cost Management & Guardrails

Implemented proactive measures to guarantee the architecture remains within the AWS Free Tier (1 million requests / 400,000 GB-seconds per month).

- **CloudWatch Log Retention:** Modified the default indefinite log storage behavior. The `deploy_lambda.sh` script established a strict seven-day retention policy for the `/aws/lambda/portfolio-api` log group, preventing accidental accumulation of storage beyond the 5 GB free tier limit.
- **AWS Budgets:** Executed `create_cost_budget.sh` to initialize a zero-cost billing alert system.

## 5. Frontend Integration (Next.js)

Finalized the connection between the decoupled architecture components.

- **Environment Configuration:** Duplicated `.env.example` to `.env.local` within the `portfolio-frontend` directory.
- **API Mapping:** Assigned the live AWS Lambda Function URL to the `NEXT_PUBLIC_API_URL` variable, enabling successful data fetching operations from the local Next.js development server (`npm run dev`).
