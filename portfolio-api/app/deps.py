import hashlib
from fastapi import Request, HTTPException
from datetime import datetime, UTC


# In-memory rate limiter (replace with Redis for production)
rate_limit_store: dict[str, dict] = {}


async def rate_limit_by_ip(
    request: Request, max_requests: int = 5, window_seconds: int = 3600
) -> bool:
    """
    Rate limit by IP address. Raises HTTPException(429) if exceeded.

    Args:
        request: FastAPI request object.
        max_requests: Maximum allowed requests per window.
        window_seconds: Window duration in seconds.

    Returns:
        True if the request is allowed.

    Raises:
        HTTPException: 429 if rate limit exceeded.
    """
    client_ip = request.client.host
    now = datetime.now(UTC)
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
            detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds // 3600} hour(s).",
        )
    else:
        entry["count"] += 1

    return True


def hash_ip(ip: str) -> str:
    """
    Hash IP for storage (GDPR-friendly).

    Args:
        ip: Raw IP address string.

    Returns:
        First 16 characters of SHA256 hash of the IP.
    """
    return hashlib.sha256(ip.encode()).hexdigest()[:16]
