from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Loads env vars from .env and environment"""

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # FastAPI
    app_name: str = "Portfolio API"
    debug: bool = False
    api_version: str = "v1"

    # CORS
    allowed_origins: str = "https://yourdomain.com,http://localhost:3000"

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


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton"""
    return Settings()
