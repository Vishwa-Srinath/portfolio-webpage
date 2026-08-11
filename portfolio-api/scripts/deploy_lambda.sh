#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ARTIFACT="$API_DIR/dist/portfolio-api-lambda.zip"

AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
AWS_REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="${FUNCTION_NAME:-portfolio-api}"
EXECUTION_ROLE_NAME="${EXECUTION_ROLE_NAME:-portfolio-api-lambda-role}"
ENV_FILE="${ENV_FILE:-$API_DIR/.env.lambda}"
MEMORY_SIZE="${MEMORY_SIZE:-256}"
FUNCTION_TIMEOUT="${FUNCTION_TIMEOUT:-15}"
RESERVED_CONCURRENCY="${RESERVED_CONCURRENCY:-2}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-7}"
SKIP_BUILD="${SKIP_BUILD:-false}"

for command_name in aws curl python3; do
  command -v "$command_name" >/dev/null || {
    echo "Required command not found: $command_name" >&2
    exit 1
  }
done

aws sts get-caller-identity >/dev/null

if [[ "$SKIP_BUILD" != "true" ]]; then
  "$SCRIPT_DIR/build_lambda_zip.sh"
fi
if [[ ! -f "$ARTIFACT" ]]; then
  echo "Lambda ZIP not found: $ARTIFACT" >&2
  exit 1
fi

ENV_JSON=$(mktemp /tmp/portfolio-lambda-env.XXXXXX.json)
TRUST_JSON=$(mktemp /tmp/portfolio-lambda-trust.XXXXXX.json)
cleanup() {
  rm -f "$ENV_JSON" "$TRUST_JSON"
}
trap cleanup EXIT

python3 "$SCRIPT_DIR/render_lambda_environment.py" "$ENV_FILE" "$ENV_JSON"

if ! ROLE_ARN=$(aws iam get-role \
    --role-name "$EXECUTION_ROLE_NAME" \
    --query 'Role.Arn' \
    --output text 2>&1); then
  if [[ "$ROLE_ARN" == *"NoSuchEntity"* ]]; then
    ROLE_ARN=""
  else
    echo "$ROLE_ARN" >&2
    exit 1
  fi
fi

if [[ -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  cat >"$TRUST_JSON" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
JSON

  echo "Creating Lambda execution role: $EXECUTION_ROLE_NAME"
  ROLE_ARN=$(aws iam create-role \
    --role-name "$EXECUTION_ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_JSON" \
    --description "CloudWatch Logs role for the portfolio API Lambda" \
    --query 'Role.Arn' \
    --output text)

fi

aws iam attach-role-policy \
  --role-name "$EXECUTION_ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

if ! PACKAGE_TYPE=$(aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'Configuration.PackageType' \
    --output text 2>&1); then
  if [[ "$PACKAGE_TYPE" == *"ResourceNotFoundException"* ]]; then
    PACKAGE_TYPE=""
  else
    echo "$PACKAGE_TYPE" >&2
    exit 1
  fi
fi

if [[ "$PACKAGE_TYPE" == "Image" ]]; then
  echo "Function $FUNCTION_NAME already uses a container image." >&2
  echo "AWS cannot convert an existing function between Image and Zip package types." >&2
  echo "Choose a new name, for example: FUNCTION_NAME=portfolio-api-zip $0" >&2
  exit 1
fi

if [[ "$PACKAGE_TYPE" == "Zip" ]]; then
  echo "Updating Lambda code: $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ARTIFACT" \
    --region "$AWS_REGION" \
    --query 'FunctionArn' \
    --output text >/dev/null
  aws lambda wait function-updated-v2 \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION"

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --runtime python3.12 \
    --handler lambda_handler.handler \
    --architectures x86_64 \
    --memory-size "$MEMORY_SIZE" \
    --timeout "$FUNCTION_TIMEOUT" \
    --environment "file://$ENV_JSON" \
    --region "$AWS_REGION" \
    --query 'FunctionArn' \
    --output text >/dev/null
  aws lambda wait function-updated-v2 \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION"
else
  echo "Creating ZIP-based Lambda function: $FUNCTION_NAME"
  create_error=""
  for attempt in {1..12}; do
    if create_error=$(aws lambda create-function \
      --function-name "$FUNCTION_NAME" \
      --package-type Zip \
      --runtime python3.12 \
      --handler lambda_handler.handler \
      --architectures x86_64 \
      --role "$ROLE_ARN" \
      --zip-file "fileb://$ARTIFACT" \
      --memory-size "$MEMORY_SIZE" \
      --timeout "$FUNCTION_TIMEOUT" \
      --environment "file://$ENV_JSON" \
      --region "$AWS_REGION" \
      --query 'FunctionArn' \
      --output text 2>&1); then
      break
    fi

    if [[ "$create_error" != *"cannot be assumed by Lambda"* || "$attempt" == "12" ]]; then
      echo "$create_error" >&2
      exit 1
    fi
    echo "Waiting for IAM role propagation (attempt $attempt/12)..."
    sleep 5
  done
fi

aws lambda wait function-active-v2 \
  --function-name "$FUNCTION_NAME" \
  --region "$AWS_REGION"

VERSION=$(aws lambda publish-version \
  --function-name "$FUNCTION_NAME" \
  --description "ZIP deployment $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --region "$AWS_REGION" \
  --query 'Version' \
  --output text)

# Reserved concurrency costs nothing and bounds simultaneous database/API work.
if ! aws lambda put-function-concurrency \
  --function-name "$FUNCTION_NAME" \
  --reserved-concurrent-executions "$RESERVED_CONCURRENCY" \
  --region "$AWS_REGION" \
  --query 'ReservedConcurrentExecutions' \
  --output text >/dev/null; then
  echo "WARNING: reserved concurrency could not be set. Check the account concurrency quota." >&2
fi

LOG_GROUP="/aws/lambda/$FUNCTION_NAME"
aws logs create-log-group \
  --log-group-name "$LOG_GROUP" \
  --region "$AWS_REGION" 2>/dev/null || true
aws logs put-retention-policy \
  --log-group-name "$LOG_GROUP" \
  --retention-in-days "$LOG_RETENTION_DAYS" \
  --region "$AWS_REGION"

if ! FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'FunctionUrl' \
    --output text 2>&1); then
  if [[ "$FUNCTION_URL" == *"ResourceNotFoundException"* ]]; then
    FUNCTION_URL=""
  else
    echo "$FUNCTION_URL" >&2
    exit 1
  fi
fi
if [[ -z "$FUNCTION_URL" || "$FUNCTION_URL" == "None" ]]; then
  FUNCTION_URL=$(aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type NONE \
    --invoke-mode BUFFERED \
    --region "$AWS_REGION" \
    --query 'FunctionUrl' \
    --output text)
else
  URL_AUTH_TYPE=$(aws lambda get-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'AuthType' \
    --output text)
  if [[ "$URL_AUTH_TYPE" != "NONE" ]]; then
    aws lambda update-function-url-config \
      --function-name "$FUNCTION_NAME" \
      --auth-type NONE \
      --invoke-mode BUFFERED \
      --region "$AWS_REGION" \
      --query 'FunctionUrl' \
      --output text >/dev/null
  fi
fi

POLICY=$(
  aws lambda get-policy \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'Policy' \
    --output text 2>/dev/null || true
)

# New Function URLs require both statements as of October 2025.
if [[ "$POLICY" != *"FunctionURLAllowPublicAccess"* ]]; then
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal '*' \
    --function-url-auth-type NONE \
    --region "$AWS_REGION" \
    --query 'Statement' \
    --output text >/dev/null
fi
if [[ "$POLICY" != *"FunctionURLInvokeAllowPublicAccess"* ]]; then
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLInvokeAllowPublicAccess \
    --action lambda:InvokeFunction \
    --principal '*' \
    --invoked-via-function-url \
    --region "$AWS_REGION" \
    --query 'Statement' \
    --output text >/dev/null
fi

echo "Waiting for the public Function URL to become reachable..."
HEALTH_RESPONSE=$(curl --fail --silent --show-error \
  --retry 8 \
  --retry-delay 3 \
  --retry-all-errors \
  --max-time 30 \
  "${FUNCTION_URL}api/v1/health")
python3 -c '
import json
import sys

payload = json.loads(sys.argv[1])
if payload.get("status") != "healthy" or payload.get("database") != "ok":
    raise SystemExit(f"Unhealthy Lambda response: {payload}")
' "$HEALTH_RESPONSE"
echo "$HEALTH_RESPONSE"
echo "Deployment complete"
echo "Function: $FUNCTION_NAME"
echo "Region:   $AWS_REGION"
echo "Version:  $VERSION"
echo "URL:      $FUNCTION_URL"
echo "Health:   ${FUNCTION_URL}api/v1/health"
