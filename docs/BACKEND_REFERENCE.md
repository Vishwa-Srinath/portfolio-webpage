# BACKEND ARCHITECTURE REFERENCE (FastAPI)
**Version:** 1.0 | **Last Updated:** 2026-06-21  
**Purpose:** Live coding reference for FastAPI service — copy patterns, adapt, stay on structure

---

## 1. Project Folder Structure (Copy-Paste Ready)

```
portfolio-api/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI() app, CORS, dependencies, exception handlers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # pydantic-settings: Env variables, secrets
│   │   ├── logging.py              # Structured JSON logging setup
│   │   └── security.py             # Rate limiting config
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py           # Router that includes all v1 routes
│   │       ├── contact.py          # POST /api/v1/contact
│   │       ├── health.py           # GET /api/v1/health
│   │       └── events.py           # POST /api/v1/events (optional, v1.5)
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py              # Pydantic models for all request/response shapes
│   ├── services/
│   │   ├── __init__.py
│   │   ├── email_service.py        # Send contact notification emails
│   │   ├── supabase_service.py     # Wrapper around Supabase client
│   │   └── rate_limit_service.py   # IP-based rate limiting
│   ├── deps.py                     # FastAPI dependency injection functions
│   └── exceptions.py               # Custom exception classes
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # pytest fixtures (mocked supabase, etc.)
│   ├── test_contact.py             # Tests for contact endpoint
│   ├── test_health.py              # Tests for health check
│   └── test_rate_limit.py          # Tests for rate limiting
├── migrations/
│   └── (empty, managed by Supabase CLI)
├── Dockerfile                       # For containerization
├── .dockerignore
├── pyproject.toml                   # Dependencies (using uv, poetry, or pip)
├── requirements.txt                 # Pinned deps for reproducible builds
├── .env.example
├── .env.local (git-ignored)
└── README.md
```

## 2. Core Dependencies (pyproject.toml / requirements.txt)

**File: `pyproject.toml`** (recommended, more modern)
```toml
[project]
name = "portfolio-api"
version = "1.0.0"
description = "Personal portfolio backend"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]==0.104.1",
    "uvicorn[standard]==0.24.0",
    "pydantic-settings==2.1.0",
    "python-dotenv==1.0.0",
    "email-validator==2.1.0",
    "supabase==2.4.0",
    "httpx==0.25.2",
    "slowapi==0.1.9",
    "python-json-logger==2.0.7",
    "resend==0.3.0",
]

[project.optional-dependencies]
dev = [
    "pytest==7.4.3",
    "pytest-asyncio==0.21.1",
    "pytest-cov==4.1.0",
    "black==23.12.0",
    "ruff==0.1.8",
    "mypy==1.7.1",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

Or **File: `requirements.txt`** (for simpler setup):
```
fastapi[standard]==0.104.1
uvicorn[standard]==0.24.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
email-validator==2.1.0
supabase==2.4.0
httpx==0.25.2
slowapi==0.1.9
python-json-logger==2.0.7
resend==0.3.0
gunicorn==21.2.0
```

## 3. Configuration (core/config.py)

**File: `app/core/config.py`**
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Loads env vars from .env and environment"""
    
    # FastAPI
    app_name: str = "Portfolio API"
    debug: bool = False
    api_version: str = "v1"
    
    # CORS
    allowed_origins: list[str] = ["https://yourdomain.com", "http://localhost:3000"]
    
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    
    # Email
    resend_api_key: str = ""  # Leave empty if using SMTP instead
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@yourdomain.com"
    contact_notification_email: str  # Where contact forms go
    
    # Rate limiting
    rate_limit_requests: int = 5
    rate_limit_window_seconds: int = 3600  # 5 requests per hour per IP
    
    # Sentry (optional)
    sentry_dsn: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

@lru_cache
def get_settings():
    """Cached settings singleton"""
    return Settings()
```

## 4. Main Application (main.py)

**File: `app/main.py`**
```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import json

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.api.v1 import router as v1_router
from app.exceptions import AppException

# Setup logging before app creation
logger = setup_logging()
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup/shutdown logic"""
    logger.info(f"Starting {settings.app_name}")
    yield
    logger.info(f"Shutting down {settings.app_name}")

# Create app
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware (CRITICAL: only allow your domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "api.yourdomain.com", "localhost"],
)

# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    logger.warning(f"AppException: {exc.detail} | Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)} | Path: {request.url.path}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Include routers
app.include_router(v1_router, prefix="/api/v1")

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """API documentation available at /docs"""
    return {"message": "Portfolio API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
```

## 5. Pydantic Models (models/schemas.py)

**File: `app/models/schemas.py`**
```python
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

# Contact form
class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=10, max_length=3000)
    honeypot: Optional[str] = None  # Should always be empty (bot trap)
    
    @field_validator("honeypot")
    @classmethod
    def check_honeypot(cls, v):
        if v:  # If honeypot is filled, reject
            raise ValueError("Bot detected")
        return v

class ContactResponse(BaseModel):
    success: bool
    id: str
    message: Optional[str] = None

# Health check
class HealthCheckResponse(BaseModel):
    status: str
    version: str
    database: str  # "ok" or "error"

# Analytics event (optional, v1.5+)
class EventRequest(BaseModel):
    event_name: str = Field(min_length=1, max_length=100)
    page: str
    metadata: Optional[dict] = None

class EventResponse(BaseModel):
    success: bool
    id: str
```

## 6. Email Service (services/email_service.py)

**File: `app/services/email_service.py`**
```python
import logging
from app.core.config import get_settings
import httpx

logger = logging.getLogger(__name__)
settings = get_settings()

async def send_contact_notification(name: str, email: str, message: str) -> bool:
    """
    Send an email notification when someone submits the contact form.
    Using Resend as the default; can swap to SMTP if needed.
    """
    
    if not settings.resend_api_key:
        logger.warning("Resend API key not set, email notification skipped")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                },
                json={
                    "from": settings.smtp_from_email,
                    "to": settings.contact_notification_email,
                    "subject": f"New contact from {name}",
                    "html": f"""
                    <h2>New Contact Form Submission</h2>
                    <p><strong>From:</strong> {name} ({email})</p>
                    <p><strong>Message:</strong></p>
                    <p>{message}</p>
                    """,
                },
                timeout=10.0,
            )
        
        if response.status_code == 200:
            logger.info(f"Contact email sent from {email}")
            return True
        else:
            logger.error(f"Resend error: {response.status_code}")
            return False
    
    except Exception as e:
        logger.error(f"Email service error: {e}")
        return False
```

## 7. Supabase Service (services/supabase_service.py)

**File: `app/services/supabase_service.py`**
```python
import logging
from supabase import create_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Create service-role client (server-side only)
supabase_client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)

async def insert_contact_message(name: str, email: str, message: str, ip_hash: str) -> str | None:
    """
    Insert a contact form submission into the database.
    Returns the UUID of the inserted row, or None on failure.
    """
    try:
        response = supabase_client.table("messages").insert({
            "name": name,
            "email": email,
            "message": message,
            "ip_hash": ip_hash,
            "is_read": False,
        }).execute()
        
        if response.data:
            logger.info(f"Contact message stored: {response.data[0]['id']}")
            return response.data[0]["id"]
        else:
            logger.error(f"Insert failed: {response}")
            return None
    
    except Exception as e:
        logger.error(f"Database insert error: {e}")
        return None

async def insert_event(event_name: str, page: str, metadata: dict | None = None) -> bool:
    """
    Insert an analytics event.
    """
    try:
        supabase_client.table("events").insert({
            "event_name": event_name,
            "page": page,
            "metadata": metadata or {},
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Event insert error: {e}")
        return False
```

## 8. Rate Limiting Dependency (deps.py)

**File: `app/deps.py`**
```python
import hashlib
from fastapi import Request, HTTPException
from datetime import datetime, timedelta
import json

# In-memory rate limiter (replace with Redis for production)
rate_limit_store = {}

async def rate_limit_by_ip(request: Request, max_requests: int = 5, window_seconds: int = 3600):
    """
    Rate limit by IP address. Raises HTTPException(429) if exceeded.
    In production, use Redis instead of in-memory dict.
    """
    client_ip = request.client.host
    now = datetime.utcnow()
    key = f"{client_ip}"
    
    if key not in rate_limit_store:
        rate_limit_store[key] = {"count": 0, "window_start": now}
    
    entry = rate_limit_store[key]
    window_age = (now - entry["window_start"]).total_seconds()
    
    if window_age > window_seconds:
        # Window expired, reset
        entry["count"] = 1
        entry["window_start"] = now
    elif entry["count"] >= max_requests:
        # Exceeded limit
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds // 3600} hour(s)."
        )
    else:
        entry["count"] += 1
    
    return True

def hash_ip(ip: str) -> str:
    """Hash IP for storage (GDPR-friendly)"""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]
```

## 9. Contact Endpoint (api/v1/contact.py)

**File: `app/api/v1/contact.py`**
```python
import logging
from fastapi import APIRouter, Request, Depends
from app.models.schemas import ContactRequest, ContactResponse
from app.core.config import get_settings
from app.services.email_service import send_contact_notification
from app.services.supabase_service import insert_contact_message
from app.deps import rate_limit_by_ip, hash_ip
from app.exceptions import AppException

router = APIRouter(tags=["contact"])
logger = logging.getLogger(__name__)
settings = get_settings()

@router.post("/contact", response_model=ContactResponse)
async def submit_contact(
    request: ContactRequest,
    req: Request,
    rate_limited: bool = Depends(rate_limit_by_ip),
):
    """
    Submit a contact form.
    Validates input, checks rate limit, stores in DB, sends notification email.
    """
    
    # Honeypot validation (already done by Pydantic, but explicit is clear)
    if request.honeypot:
        logger.warning(f"Honeypot triggered from {req.client.host}")
        # Don't reveal honeypot was used; silently return success (confuses bots)
        return ContactResponse(success=True, id="noop", message="Message sent!")
    
    # Rate limit (dependency validates this)
    if not rate_limited:
        raise AppException(status_code=429, detail="Too many requests")
    
    # Store in database
    ip_hash = hash_ip(req.client.host)
    message_id = await insert_contact_message(
        name=request.name,
        email=request.email,
        message=request.message,
        ip_hash=ip_hash,
    )
    
    if not message_id:
        raise AppException(status_code=500, detail="Failed to store message")
    
    # Send notification email
    email_sent = await send_contact_notification(
        name=request.name,
        email=request.email,
        message=request.message,
    )
    
    if not email_sent:
        logger.warning(f"Email notification failed for contact {message_id}")
        # Still return success — message was stored, email is a bonus
    
    return ContactResponse(success=True, id=message_id)
```

## 10. Health Check Endpoint (api/v1/health.py)

**File: `app/api/v1/health.py`**
```python
from fastapi import APIRouter
from app.models.schemas import HealthCheckResponse
from app.services.supabase_service import supabase_client
import logging

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Liveness/readiness probe for container orchestration (Render, etc).
    Checks if the service and database are healthy.
    
    Reuses the shared supabase_client singleton from supabase_service
    instead of creating a new client on every probe (runs every 30s).
    """
    
    db_status = "ok"
    try:
        # Quick query to verify DB connectivity (reuses shared client)
        supabase_client.table("messages").select("id").limit(1).execute()
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "error"
    
    return HealthCheckResponse(
        status="healthy" if db_status == "ok" else "degraded",
        version="1.0.0",
        database=db_status,
    )
```

## 11. Router Aggregator (api/v1/router.py)

**File: `app/api/v1/router.py`**
```python
from fastapi import APIRouter
from app.api.v1 import contact, health

router = APIRouter()

# Include endpoint routers
router.include_router(contact.router)
router.include_router(health.router)

# Future: router.include_router(events.router)
```

## 12. Custom Exceptions (exceptions.py)

**File: `app/exceptions.py`**
```python
class AppException(Exception):
    """Base exception for all app-specific errors"""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)

class RateLimitException(AppException):
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(429, detail)

class ValidationException(AppException):
    def __init__(self, detail: str):
        super().__init__(422, detail)

class NotFoundError(AppException):
    def __init__(self, detail: str = "Not found"):
        super().__init__(404, detail)
```

## 13. Logging Setup (core/logging.py)

**File: `app/core/logging.py`**
```python
import logging
import logging.handlers
import json
from pythonjsonlogger import jsonlogger

def setup_logging():
    """
    Configure structured JSON logging.
    Output to stdout (picked up by container logs) and rotating file handler.
    """
    
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # JSON formatter for stdout (structured, machine-readable)
    json_formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    
    # Stdout handler (picked up by `docker logs`)
    stdout_handler = logging.StreamHandler()
    stdout_handler.setFormatter(json_formatter)
    logger.addHandler(stdout_handler)
    
    # File handler (optional, for rotating logs)
    file_handler = logging.handlers.RotatingFileHandler(
        "logs/app.log",
        maxBytes=10_000_000,  # 10MB
        backupCount=5,
    )
    file_handler.setFormatter(json_formatter)
    logger.addHandler(file_handler)
    
    return logger
```

## 14. Environment Variables (.env.example)

**File: `.env.example`**
```bash
# FastAPI
DEBUG=false
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Supabase (REQUIRED)
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Email notifications (at least one must be configured)
RESEND_API_KEY=re_xxxxxxxxxxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
CONTACT_NOTIFICATION_EMAIL=you@yourdomain.com

# Rate limiting
RATE_LIMIT_REQUESTS=5
RATE_LIMIT_WINDOW_SECONDS=3600

# Monitoring (optional)
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[id]
```

## 15. Testing Pattern (tests/test_contact.py)

**File: `tests/test_contact.py`**
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_supabase(monkeypatch):
    """Mock Supabase insert"""
    async_mock = AsyncMock(return_value="test-uuid-123")
    monkeypatch.setattr(
        "app.services.supabase_service.insert_contact_message",
        async_mock,
    )
    return async_mock

def test_contact_form_success(mock_supabase):
    """Test valid contact form submission"""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Alice",
            "email": "alice@example.com",
            "message": "I love your portfolio!",
            "honeypot": "",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["id"] == "test-uuid-123"

def test_contact_honeypot_rejected():
    """Test honeypot protection"""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Bot",
            "email": "bot@spam.com",
            "message": "SPAM SPAM SPAM",
            "honeypot": "filled-by-bot",
        },
    )
    # Should still return 200 (don't reveal honeypot)
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_contact_invalid_email():
    """Test email validation"""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Charlie",
            "email": "not-an-email",
            "message": "Invalid email",
            "honeypot": "",
        },
    )
    assert response.status_code == 422

def test_health_check():
    """Test health endpoint"""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
```

## 16. Dockerfile (for containerization)

**File: `Dockerfile`**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Quick Reference: When Building

| Task | File | Pattern |
|---|---|---|
| Add a new endpoint | `app/api/v1/[name].py`, include router in `router.py` | Define Pydantic request/response, use `@router.post()` decorator |
| Change rate limit | `app/core/config.py` | Modify `rate_limit_requests`, `rate_limit_window_seconds` |
| Change email provider | `app/services/email_service.py` | Swap Resend for SMTP or another service |
| Add database table | Supabase dashboard or migrations file | Create in Supabase, query via `supabase_client.table()` |
| Add logging | Any `.py` file | `logger.info()`, `logger.error()` — automatically JSON formatted |
| Test an endpoint | `tests/test_[endpoint].py` | Use `TestClient`, mock Supabase/email |
