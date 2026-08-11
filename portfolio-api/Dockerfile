FROM python:3.12-slim

WORKDIR /app

# ── AWS Lambda Web Adapter ──────────────────────────────────────────────────
# Translates Lambda invoke events into HTTP requests against localhost:8000.
# Your FastAPI/uvicorn app never knows it is running inside Lambda.
# Source: https://github.com/aws/aws-lambda-web-adapter
# Verify the tag is current before every new build:
#   https://github.com/aws/aws-lambda-web-adapter/releases
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 \
     /lambda-adapter /opt/extensions/lambda-adapter

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app/ app/
COPY migrations/ migrations/

# Create logs directory
RUN mkdir -p logs

# ── Lambda Web Adapter config ───────────────────────────────────────────────
# PORT           → port your uvicorn process listens on (must match CMD below)
# READINESS_CHECK_PATH → path the adapter polls until your app is ready;
#                        reuses the existing health endpoint (no code change needed)
# Note: Docker HEALTHCHECK is intentionally removed — Lambda does not execute it,
#       and AWS_LWA_READINESS_CHECK_PATH does the equivalent job inside Lambda.
ENV PORT=8000
ENV AWS_LWA_READINESS_CHECK_PATH=/api/v1/health

# Run app — identical to the original; local docker run still works fine
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
