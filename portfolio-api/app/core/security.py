"""
Rate limiting configuration constants.

These are the default values; actual values come from Settings (env vars).
Kept here for easy reference and import by other modules.
"""

# Default rate limit: 5 requests per hour per IP
DEFAULT_MAX_REQUESTS: int = 5
DEFAULT_WINDOW_SECONDS: int = 3600  # 1 hour
