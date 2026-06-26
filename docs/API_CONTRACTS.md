# API CONTRACTS REFERENCE
**Version:** 1.0 | **Last Updated:** 2026-06-21  
**Purpose:** Contract between frontend (Next.js) and backend (FastAPI) — single source of truth for endpoints

---

## Overview

All API calls from the frontend to the backend use HTTPS with the `NEXT_PUBLIC_API_URL` environment variable as the base. The frontend **never** talks to Supabase directly except for reading embeddings (v2+) — everything sensitive goes through the FastAPI backend first.

**Endpoints Base:** `{NEXT_PUBLIC_API_URL}/api/v1`

---

## 1. Contact Form Endpoint

### POST `/api/v1/contact`

**Purpose:** Submit a contact form from the website.

**Frontend Code Example:**

```typescript
// app/contact/page.tsx (client component)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
      honeypot: formData.get("honeypot") || "",  // Hidden field, should be empty
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        e.currentTarget.reset();
      }
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-600">Message sent!</h2>
        <p>I'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" placeholder="Your name" required />
      <input type="email" name="email" placeholder="your@email.com" required />
      <textarea name="message" placeholder="Your message..." required />
      <input type="text" name="honeypot" style={{ display: "none" }} />
      <Button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
```

**Request Schema (Pydantic):**

```python
class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=10, max_length=3000)
    honeypot: Optional[str] = None  # Bot trap, must be empty
```

**Request Example:**

```json
{
  "name": "Vishwa",
  "email": "vishwa@example.com",
  "message": "I'm impressed with your AgenTrix project and wanted to connect!",
  "honeypot": ""
}
```

**Response Schema:**

```python
class ContactResponse(BaseModel):
    success: bool
    id: str        # UUID of stored message
    message: Optional[str] = None
```

**Response Example (Success):**

```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Example (Rate Limited):**

```json
{
  "detail": "Rate limit exceeded. Max 5 requests per 1 hour(s)."
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Success (message stored) |
| 422 | Validation error (bad email, message too short, etc.) |
| 429 | Rate limit exceeded (5 messages per hour per IP) |
| 500 | Internal error (Supabase down, email service down, etc.) |

**Behavior:**

- ✅ Stores in `messages` table
- ✅ Sends notification email to admin
- ✅ Rate-limits by IP address (5 per hour)
- ✅ Honeypot returns 200 (doesn't reveal bot trap)
- ✅ All input validated before reaching database

---

## 2. Health Check Endpoint

### GET `/api/v1/health`

**Purpose:** Liveness probe for monitoring (UptimeRobot, container orchestration, etc.).

**Frontend:** Usually called by monitoring service, not your app code. But example:

```typescript
async function checkBackendHealth() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/health`);
    const data = await response.json();
    console.log("Backend status:", data.status, "Database:", data.database);
  } catch (err) {
    console.error("Backend unreachable");
  }
}
```

**Response Schema:**

```python
class HealthCheckResponse(BaseModel):
    status: str       # "healthy" or "degraded"
    version: str      # "1.0.0"
    database: str     # "ok" or "error"
```

**Response Example:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "ok"
}
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Service is healthy (database may be degraded) |
| 503 | Service is unavailable |

---

## 3. Analytics Events Endpoint (v1.5+, Optional)

### POST `/api/v1/events`

**Purpose:** Log custom analytics events (e.g., "resume downloaded", "algorithm visualizer opened").

**Frontend Code Example:**

```typescript
// lib/api.ts - wrapper function
export async function logEvent(eventName: string, page: string, metadata?: Record<string, any>) {
  if (!process.env.NEXT_PUBLIC_API_URL) return;

  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        page,
        metadata: metadata || {},
      }),
    });
  } catch (err) {
    // Silently fail, don't break the app if analytics is down
    console.debug("Analytics logging failed");
  }
}

// Usage: components/projects/ProjectCard.tsx
"use client";
export function ProjectCard({ slug, title }: Project) {
  function handleViewCode() {
    logEvent("view_code_clicked", `/projects/${slug}`, {
      project: title,
    });
    // Then navigate...
  }

  return <button onClick={handleViewCode}>View Code</button>;
}
```

**Request Schema:**

```python
class EventRequest(BaseModel):
    event_name: str = Field(min_length=1, max_length=100)
    page: str
    metadata: Optional[dict] = None
```

**Request Example:**

```json
{
  "event_name": "resume_download",
  "page": "/about",
  "metadata": {
    "format": "pdf",
    "timestamp": "2026-06-21T14:30:00Z"
  }
}
```

**Response Schema:**

```python
class EventResponse(BaseModel):
    success: bool
    id: str  # UUID of event
```

**Status Codes:**

| Code | Meaning |
|---|---|
| 200 | Event logged |
| 422 | Validation error |
| 500 | Internal error (non-critical, app continues) |

**Recommended Events to Track:**

- `resume_download` — when user clicks resume PDF link
- `project_link_clicked` — external link to live demo or repo
- `algo_visualizer_opened` — when algorithm step-through is opened
- `youtube_link_clicked` — when user clicks YouTube video link
- `github_profile_clicked` — when user visits your GitHub

---

## 4. Error Handling (All Endpoints)

All errors from the backend follow a consistent shape:

```json
{
  "detail": "Human-readable error message"
}
```

**Frontend Error Handling Pattern:**

```typescript
// lib/api.ts
export async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Usage
try {
  const result = await apiFetch("/api/v1/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contactData),
  });
} catch (err) {
  // err.message is the detail string from backend
  setErrorMessage(err.message);
}
```

---

## 5. Authentication & Secrets

### What the Frontend Can See

✅ **Public** (safe to embed in `NEXT_PUBLIC_*`):
- API URL
- Supabase public key
- Sentry DSN
- Plausible domain

❌ **Secret** (never in browser):
- Supabase service-role key
- Database passwords
- API signing keys
- Email service credentials

### Request Headers

All requests include standard headers:

```typescript
const headers = {
  "Content-Type": "application/json",
  "Origin": "https://yourdomain.com",  // CORS enforcement by backend
};
```

The backend checks CORS and rejects requests from unauthorized origins.

---

## 6. CORS & Origin Validation

The backend whitelist (from `core/config.py`):

```python
allowed_origins = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "http://localhost:3000",  # local dev only
]
```

**If you get CORS errors:**

1. Check that your frontend domain is in `allowed_origins`
2. Verify `NEXT_PUBLIC_API_URL` points to the correct backend
3. Check backend logs: `docker logs [container]` or Render logs

---

## 7. Rate Limiting Details

**Contact endpoint:** 5 requests per hour per IP address.

**Error response when rate-limited:**

```json
{
  "status_code": 429,
  "detail": "Rate limit exceeded. Max 5 requests per 1 hour(s)."
}
```

**How it works:**
- Backend hashes your IP address for privacy
- Tracks requests in memory (replace with Redis in production if deploying at scale)
- Window resets every hour
- Honeypot submissions don't count against the limit (return 200 before checking)

**Frontend handling:**

```typescript
if (response.status === 429) {
  // Show user: "You can submit again in X minutes"
  alert("Please wait an hour before submitting another message.");
}
```

---

## 8. Timeout & Retry Strategy

The backend has no built-in retries. If a request fails, the frontend should handle it:

```typescript
async function submitContactWithRetry(data: ContactRequest, maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await apiCall("/contact", { method: "POST", body: JSON.stringify(data) });
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      // Wait before retry: 1s on first attempt, 2s on second
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
}
```

---

## 9. V2 Future: RAG Endpoint (Reserved)

**Not in v1, sketched for reference:**

### POST `/api/v1/ask`

```json
{
  "query": "What's the difference between Kruskal's and Prim's algorithm?",
  "context": "learn"  // Optional: filter to specific lane
}
```

**Response:**

```json
{
  "answer": "Kruskal's uses a greedy approach on edges...",
  "sources": [
    { "slug": "kruskals-mst", "lane": "learn", "excerpt": "..." }
  ]
}
```

---

## 10. API Contracts Checklist (Before Deployment)

- [ ] Frontend has `NEXT_PUBLIC_API_URL` set correctly (staging/prod)
- [ ] Backend has frontend domain in `allowed_origins`
- [ ] Backend Supabase keys are set (anon for reads, service-role for writes)
- [ ] Email service keys are set (Resend or SMTP)
- [ ] Contact form tested end-to-end (submit → database → email)
- [ ] Health check passes: `curl https://api.yourdomain.com/api/v1/health`
- [ ] Rate limiting tested (submit 6 times, 6th should fail)
- [ ] CORS tested from production domain (not localhost)

---

## Quick Reference

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/v1/contact` | POST | Contact form | None (rate-limited by IP) |
| `/api/v1/health` | GET | Liveness probe | None |
| `/api/v1/events` | POST | Analytics logging | None (optional, v1.5) |
| `/api/v1/ask` | POST | RAG search | None (v2, reserved) |
