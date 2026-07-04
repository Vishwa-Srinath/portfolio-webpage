"""Tests for rate limiting behavior on POST /api/v1/contact."""

from unittest.mock import patch, AsyncMock


def test_rate_limit_allows_5_requests(client, mock_insert_contact, mock_send_email):
    """Test that 5 requests within the window are allowed."""
    for i in range(5):
        response = client.post(
            "/api/v1/contact",
            json={
                "name": f"User{i}",
                "email": f"user{i}@example.com",
                "message": f"Test message number {i} for rate limiting.",
                "honeypot": "",
            },
        )
        assert response.status_code == 200, f"Request {i + 1} should succeed"


def test_rate_limit_blocks_6th_request(client, mock_insert_contact, mock_send_email):
    """Test that the 6th request within the window is blocked with 429."""
    # First 5 should succeed
    for i in range(5):
        response = client.post(
            "/api/v1/contact",
            json={
                "name": f"User{i}",
                "email": f"user{i}@example.com",
                "message": f"Test message number {i} for rate limiting.",
                "honeypot": "",
            },
        )
        assert response.status_code == 200

    # 6th should be rate limited
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Blocked User",
            "email": "blocked@example.com",
            "message": "This request should be rate limited.",
            "honeypot": "",
        },
    )
    assert response.status_code == 429
    assert "Rate limit exceeded" in response.json()["detail"]


def test_rate_limit_window_reset(client, mock_insert_contact, mock_send_email):
    """Test that the rate limit window resets after expiration."""
    from datetime import datetime, timedelta, UTC
    from app.deps import rate_limit_store

    # Simulate 5 requests
    for i in range(5):
        response = client.post(
            "/api/v1/contact",
            json={
                "name": f"User{i}",
                "email": f"user{i}@example.com",
                "message": f"Test message number {i} for rate limiting.",
                "honeypot": "",
            },
        )
        assert response.status_code == 200

    # Manually expire the window by setting window_start to >1 hour ago
    for key in rate_limit_store:
        rate_limit_store[key]["window_start"] = datetime.now(UTC) - timedelta(hours=2)

    # Now the 6th request should succeed (window expired)
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Post-Reset User",
            "email": "reset@example.com",
            "message": "This request should succeed after window reset.",
            "honeypot": "",
        },
    )
    assert response.status_code == 200


def test_rate_limit_error_message_format(client, mock_insert_contact, mock_send_email):
    """Test that rate limit error message follows API contract format."""
    # Exhaust the limit
    for i in range(5):
        client.post(
            "/api/v1/contact",
            json={
                "name": f"User{i}",
                "email": f"user{i}@example.com",
                "message": f"Test message number {i} for rate limiting.",
                "honeypot": "",
            },
        )

    # Check error format
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Blocked",
            "email": "blocked@example.com",
            "message": "This should be rate limited and have proper error format.",
            "honeypot": "",
        },
    )
    assert response.status_code == 429
    data = response.json()
    assert "detail" in data
    assert "Max 5 requests per 1 hour(s)" in data["detail"]
