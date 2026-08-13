# Repository-wide instructions

## Hard AWS zero-cost policy

This project must remain within the AWS Free Tier and must not generate an AWS
charge. This is a hard architecture constraint, not a preference. It applies to
all planning, implementation, deployment, maintenance, and troubleshooting in
this repository. It overrides cost-incurring suggestions in older or historical
documents.

### Allowed AWS scope

- Use AWS only for the existing FastAPI backend on a ZIP-deployed Lambda and its
  Lambda Function URL, minimal IAM/OIDC permissions, AWS Budgets alerts, and the
  Lambda's bounded CloudWatch logs.
- Preserve the current low-cost controls unless a stricter setting is adopted:
  256 MB Lambda memory, a maximum 15-second timeout, reserved concurrency of 2,
  no provisioned concurrency, no VPC attachment, and seven-day log retention.
- Keep the current direct ZIP deployment. If the ZIP approaches the direct
  upload limit, reduce or split dependencies; do not introduce S3 or ECR as a
  deployment workaround.

### AWS storage is prohibited

- Do not store PDFs, images, videos, frontend assets, user uploads, backups,
  databases, build artifacts, or container images in AWS.
- Do not create or use S3, EBS, EFS, RDS, DynamoDB, Glacier, AWS Backup, ECR, or
  another AWS persistence product for this project.
- Public site assets belong in the frontend and are delivered by Vercel. Source
  assets belong in GitHub when appropriate. Application data remains in the
  project's existing non-AWS data services.

### Services and changes that are not allowed

- Do not add API Gateway, CloudFront, NAT Gateway, a VPC, load balancers,
  provisioned concurrency, container-based Lambda deployment, paid monitoring,
  or any other AWS resource that can introduce a fixed or usage-based charge.
- Do not increase Lambda memory, timeout, concurrency, log retention, or request
  volume controls without first proving from current official AWS pricing and
  current account usage that the new configuration cannot exceed the free tier.
- Do not rely on an AWS Budget alert as a hard spending cap; alerts can be
  delayed. Bounded resource configuration is mandatory.

### Required workflow for AWS-related work

1. Read `docs/AWS_LAMBDA_ZIP_DEPLOYMENT.md` and treat its current ZIP path as
   authoritative over the superseded Docker/ECR documents.
2. Verify current AWS Free Tier terms using official AWS sources and inspect the
   relevant account usage before making an AWS-affecting change.
3. If zero AWS cost cannot be established confidently, do not implement the
   change. Stop and propose a free non-AWS alternative.
4. Use GitHub OIDC and least-privilege IAM. Never create, print, or commit
   long-lived AWS access keys.
5. After an authorized AWS deployment, verify reserved concurrency, timeout,
   memory, Function URL configuration, seven-day log retention, and Zero-Spend
   budget alerts.

This policy can be relaxed only if the user explicitly rescinds or changes the
zero-AWS-cost requirement.
