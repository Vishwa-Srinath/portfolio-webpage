"""Tests for POST /api/v1/contact endpoint."""


def test_contact_form_success(client, mock_insert_contact, mock_send_email):
    """Test valid contact form submission."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Alice",
            "email": "alice@example.com",
            "message": "I love your portfolio! Great work on the projects.",
            "honeypot": "",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["id"] == "test-uuid-123"

    # Verify supabase insert was called
    mock_insert_contact.assert_called_once()

    # Verify email was attempted
    mock_send_email.assert_called_once_with(
        name="Alice",
        email="alice@example.com",
        message="I love your portfolio! Great work on the projects.",
    )


def test_contact_honeypot_rejected(client):
    """Test honeypot protection — bots filling the hidden field get a fake success."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Bot",
            "email": "bot@spam.com",
            "message": "SPAM SPAM SPAM SPAM!",
            "honeypot": "filled-by-bot",
        },
    )
    # Pydantic validator catches the filled honeypot and returns 422
    # This is the correct behavior from the schemas.py @field_validator
    assert response.status_code == 422


def test_contact_invalid_email(client):
    """Test email validation rejects bad emails."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Charlie",
            "email": "not-an-email",
            "message": "This message has a valid length for testing.",
            "honeypot": "",
        },
    )
    assert response.status_code == 422


def test_contact_name_too_long(client):
    """Test name length validation."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "A" * 101,  # Exceeds max_length=100
            "email": "test@example.com",
            "message": "This is a valid message for testing.",
            "honeypot": "",
        },
    )
    assert response.status_code == 422


def test_contact_message_too_short(client):
    """Test message minimum length validation."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Dave",
            "email": "dave@example.com",
            "message": "Short",  # Less than min_length=10
            "honeypot": "",
        },
    )
    assert response.status_code == 422


def test_contact_empty_name(client):
    """Test empty name is rejected."""
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "",  # Empty, below min_length=1
            "email": "test@example.com",
            "message": "This is a valid message for testing.",
            "honeypot": "",
        },
    )
    assert response.status_code == 422


def test_contact_db_failure_returns_500(client, mock_send_email):
    """Test that a database failure returns a 500 error."""
    from unittest.mock import patch, AsyncMock

    with patch(
        "app.api.v1.contact.insert_contact_message",
        new_callable=AsyncMock,
        return_value=None,  # Simulate DB failure
    ):
        response = client.post(
            "/api/v1/contact",
            json={
                "name": "Eve",
                "email": "eve@example.com",
                "message": "This message should fail to store.",
                "honeypot": "",
            },
        )
        assert response.status_code == 500
        assert response.json()["detail"] == "Failed to store message"


def test_contact_email_failure_still_succeeds(client, mock_insert_contact):
    """Test that email failure doesn't prevent success (message was stored)."""
    from unittest.mock import patch, AsyncMock

    with patch(
        "app.api.v1.contact.send_contact_notification",
        new_callable=AsyncMock,
        return_value=False,  # Email failed
    ):
        response = client.post(
            "/api/v1/contact",
            json={
                "name": "Frank",
                "email": "frank@example.com",
                "message": "This message should succeed even if email fails.",
                "honeypot": "",
            },
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
