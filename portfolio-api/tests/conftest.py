import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


# Mock settings to prevent loading real .env
mock_settings = MagicMock()
mock_settings.app_name = "Portfolio API Test"
mock_settings.debug = False
mock_settings.api_version = "v1"
mock_settings.allowed_origins = "http://localhost:3000"
mock_settings.supabase_url = "https://test-project.supabase.co"
mock_settings.supabase_anon_key = "test-anon-key"
mock_settings.supabase_service_role_key = "test-service-role-key"
mock_settings.resend_api_key = ""
mock_settings.smtp_host = "smtp.gmail.com"
mock_settings.smtp_port = 587
mock_settings.smtp_username = ""
mock_settings.smtp_password = ""
mock_settings.smtp_from_email = "noreply@test.com"
mock_settings.contact_notification_email = "admin@test.com"
mock_settings.rate_limit_requests = 5
mock_settings.rate_limit_window_seconds = 3600
mock_settings.sentry_dsn = ""


@pytest.fixture(autouse=True)
def mock_dependencies():
    """
    Mock all external dependencies before each test.
    Patches get_settings globally and prevents the Supabase client
    from being created (which would fail without real credentials).
    """
    with (
        patch("app.core.config.get_settings", return_value=mock_settings),
        patch(
            "app.services.supabase_service.get_supabase_client",
            return_value=MagicMock(),
        ),
    ):
        yield


@pytest.fixture
def client(mock_dependencies):
    """Create a test client with mocked dependencies."""
    from app.main import app

    return TestClient(app)


@pytest.fixture
def mock_insert_contact():
    """Mock the insert_contact_message function to return a test UUID."""
    with patch(
        "app.api.v1.contact.insert_contact_message",
        new_callable=AsyncMock,
        return_value="test-uuid-123",
    ) as mock:
        yield mock


@pytest.fixture
def mock_insert_event():
    """Mock the insert_event function to return a test UUID."""
    with patch(
        "app.api.v1.events.insert_event",
        new_callable=AsyncMock,
        return_value="test-event-uuid-456",
    ) as mock:
        yield mock


@pytest.fixture
def mock_send_email():
    """Mock the send_contact_notification function."""
    with patch(
        "app.api.v1.contact.send_contact_notification",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock:
        yield mock


@pytest.fixture
def mock_check_db():
    """Mock the check_db_health function."""
    with patch(
        "app.api.v1.health.check_db_health",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock:
        yield mock


@pytest.fixture(autouse=True)
def clear_rate_limit_store():
    """Clear the in-memory rate limit store before each test."""
    from app.deps import rate_limit_store

    rate_limit_store.clear()
    yield
    rate_limit_store.clear()
