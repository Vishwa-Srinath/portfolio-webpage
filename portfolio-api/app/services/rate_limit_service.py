"""
Rate limiting service module.

The core rate limiting logic lives in app/deps.py as a FastAPI dependency.
This module provides a clean service boundary for rate limiting configuration
and can be extended with Redis-backed implementations for production.
"""

import logging
from typing import Optional

from app.core.config import get_settings
from app.core.security import DEFAULT_MAX_REQUESTS, DEFAULT_WINDOW_SECONDS

logger = logging.getLogger(__name__)
settings = get_settings()


def get_rate_limit_config() -> dict[str, int]:
    """
    Get the current rate limiting configuration.

    Returns:
        Dict with 'max_requests' and 'window_seconds' keys.
    """
    return {
        "max_requests": settings.rate_limit_requests or DEFAULT_MAX_REQUESTS,
        "window_seconds": settings.rate_limit_window_seconds or DEFAULT_WINDOW_SECONDS,
    }
