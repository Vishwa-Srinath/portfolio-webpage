"""Tests for GET /api/v1/health endpoint."""

from unittest.mock import patch, AsyncMock


def test_health_check_healthy(client, mock_check_db):
    """Test health check when database is healthy."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert data["database"] == "ok"


def test_health_check_degraded(client):
    """Test health check when database is down."""
    with patch(
        "app.api.v1.health.check_db_health",
        new_callable=AsyncMock,
        return_value=False,
    ):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "error"


def test_health_check_has_required_fields(client, mock_check_db):
    """Test health response contains all required fields."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "database" in data
