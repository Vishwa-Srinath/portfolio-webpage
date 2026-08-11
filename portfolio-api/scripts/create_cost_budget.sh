#!/usr/bin/env bash
set -euo pipefail

BUDGET_EMAIL="${BUDGET_EMAIL:-}"
BUDGET_NAME="${BUDGET_NAME:-portfolio-zero-spend-warning}"

if [[ -z "$BUDGET_EMAIL" || "$BUDGET_EMAIL" != *@* ]]; then
  echo "Set BUDGET_EMAIL to the address that should receive AWS cost alerts." >&2
  exit 2
fi

aws sts get-caller-identity >/dev/null
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUDGET_JSON=$(mktemp /tmp/portfolio-budget.XXXXXX.json)
NOTIFICATIONS_JSON=$(mktemp /tmp/portfolio-budget-notifications.XXXXXX.json)
cleanup() {
  rm -f "$BUDGET_JSON" "$NOTIFICATIONS_JSON"
}
trap cleanup EXIT

cat >"$BUDGET_JSON" <<JSON
{
  "BudgetName": "$BUDGET_NAME",
  "BudgetLimit": {"Amount": "1", "Unit": "USD"},
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostTypes": {
    "IncludeTax": true,
    "IncludeSubscription": true,
    "UseBlended": false,
    "IncludeRefund": false,
    "IncludeCredit": false,
    "IncludeUpfront": true,
    "IncludeRecurring": true,
    "IncludeOtherSubscription": true,
    "IncludeSupport": true,
    "IncludeDiscount": true,
    "UseAmortized": false
  }
}
JSON

cat >"$NOTIFICATIONS_JSON" <<JSON
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 1,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "$BUDGET_EMAIL"}]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 50,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "$BUDGET_EMAIL"}]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "$BUDGET_EMAIL"}]
  }
]
JSON

if aws budgets describe-budget \
  --account-id "$ACCOUNT_ID" \
  --budget-name "$BUDGET_NAME" >/dev/null 2>&1; then
  aws budgets update-budget \
    --account-id "$ACCOUNT_ID" \
    --new-budget "file://$BUDGET_JSON"
  echo "Updated budget: $BUDGET_NAME"
else
  aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget "file://$BUDGET_JSON" \
    --notifications-with-subscribers "file://$NOTIFICATIONS_JSON"
  echo "Created budget: $BUDGET_NAME"
fi

echo "Alerts start at 1% of USD 1 (USD 0.01 actual account spend)."
echo "AWS Budgets is delayed monitoring; it is not a real-time hard spending cap."
