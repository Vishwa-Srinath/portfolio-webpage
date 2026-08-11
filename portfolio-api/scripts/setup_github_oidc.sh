#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
AWS_REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="${FUNCTION_NAME:-portfolio-api}"
DEPLOY_ROLE_NAME="${DEPLOY_ROLE_NAME:-github-actions-deploy-portfolio-api-zip}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}"

if [[ -z "$GITHUB_REPOSITORY" || "$GITHUB_REPOSITORY" != */* ]]; then
  echo "Set GITHUB_REPOSITORY to owner/repository." >&2
  echo "Example: GITHUB_REPOSITORY=your-user/portfolio-webpage $0" >&2
  exit 2
fi

aws sts get-caller-identity >/dev/null
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_ARN="arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"

TRUST_JSON=$(mktemp /tmp/github-oidc-trust.XXXXXX.json)
POLICY_JSON=$(mktemp /tmp/github-lambda-policy.XXXXXX.json)
cleanup() {
  rm -f "$TRUST_JSON" "$POLICY_JSON"
}
trap cleanup EXIT

if ! aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  echo "Creating the GitHub Actions OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --query 'OpenIDConnectProviderArn' \
    --output text >/dev/null
fi

cat >"$TRUST_JSON" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "$OIDC_ARN"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:$GITHUB_REPOSITORY:ref:refs/heads/$GITHUB_BRANCH"
      }
    }
  }]
}
JSON

ROLE_ARN=$(
  aws iam get-role \
    --role-name "$DEPLOY_ROLE_NAME" \
    --query 'Role.Arn' \
    --output text 2>/dev/null || true
)
if [[ -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  ROLE_ARN=$(aws iam create-role \
    --role-name "$DEPLOY_ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_JSON" \
    --description "GitHub OIDC role for portfolio ZIP Lambda deployments" \
    --query 'Role.Arn' \
    --output text)
else
  aws iam update-assume-role-policy \
    --role-name "$DEPLOY_ROLE_NAME" \
    --policy-document "file://$TRUST_JSON"
fi

cat >"$POLICY_JSON" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DeployOnlyPortfolioLambda",
    "Effect": "Allow",
    "Action": [
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:GetFunctionUrlConfig",
      "lambda:UpdateFunctionCode",
      "lambda:PublishVersion"
    ],
    "Resource": [
      "arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:$FUNCTION_NAME",
      "arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:$FUNCTION_NAME:*"
    ]
  }]
}
JSON

aws iam put-role-policy \
  --role-name "$DEPLOY_ROLE_NAME" \
  --policy-name DeployPortfolioLambdaZip \
  --policy-document "file://$POLICY_JSON"

echo "GitHub OIDC deployment role is ready."
echo "Repository: $GITHUB_REPOSITORY"
echo "Branch:     $GITHUB_BRANCH"
echo "Role ARN:   $ROLE_ARN"
echo
echo "Add this ARN as the GitHub repository variable AWS_DEPLOY_ROLE_ARN."
