# Portfolio API

A FastAPI backend for the personal portfolio website.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and email credentials

# 4. Run the development server
uvicorn app.main:app --reload
# Opens http://localhost:8000/docs (Swagger UI)
```

## Project Structure

```
portfolio-api/
├── app/
│   ├── main.py                     # FastAPI app, CORS, exception handlers
│   ├── core/                       # Config, logging, security
│   ├── api/v1/                     # API endpoints (contact, health, events)
│   ├── models/                     # Pydantic schemas
│   ├── services/                   # Supabase, email, rate limiting
│   ├── deps.py                     # FastAPI dependency injection
│   └── exceptions.py              # Custom exceptions
├── tests/                          # pytest tests
├── migrations/                     # SQL migrations for Supabase
├── Dockerfile                      # Container image
├── requirements.txt               # Pinned dependencies
└── .env.example                   # Environment template
```

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/contact` | POST | Contact form submission |
| `/api/v1/health` | GET | Liveness probe |
| `/api/v1/events` | POST | Analytics event logging |

## Database Setup

Run the SQL files in `migrations/` in order via Supabase Dashboard → SQL Editor:

1. `20260101000001_initial_schema.sql` — Creates tables
2. `20260101000002_rls_policies.sql` — Enables Row-Level Security

## Testing

```bash
pip install pytest pytest-asyncio pytest-cov
pytest -v --cov=app
```

## Docker

```bash
docker build -t portfolio-api .
docker run -p 8000:8000 --env-file .env.local portfolio-api
```
