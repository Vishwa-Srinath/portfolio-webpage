"""Tests for the AWS Lambda Function URL adapter."""

import json

from mangum import Mangum


def test_function_url_root_request(monkeypatch):
    # Keep the import independent of generic host-level DEBUG values.
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("AWS_LAMBDA_FUNCTION_NAME", "portfolio-api-test")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    from app.main import create_app

    handler = Mangum(create_app(), lifespan="auto")
    hostname = "test.lambda-url.us-east-1.on.aws"
    event = {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": "/",
        "rawQueryString": "",
        "headers": {
            "host": hostname,
            "x-forwarded-proto": "https",
        },
        "requestContext": {
            "accountId": "anonymous",
            "apiId": "test",
            "domainName": hostname,
            "domainPrefix": "test",
            "http": {
                "method": "GET",
                "path": "/",
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": "pytest",
            },
            "requestId": "test-request",
            "routeKey": "$default",
            "stage": "$default",
            "time": "11/Aug/2026:00:00:00 +0000",
            "timeEpoch": 0,
        },
        "isBase64Encoded": False,
    }

    response = handler(event, object())

    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == {
        "message": "Portfolio API",
        "version": "1.0.0",
    }
