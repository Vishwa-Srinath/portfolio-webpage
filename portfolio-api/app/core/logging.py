import logging
import logging.handlers
import os

from pythonjsonlogger import jsonlogger


def setup_logging() -> logging.Logger:
    """
    Configure structured JSON logging.
    Output to stdout (picked up by container logs) and rotating file handler.

    Returns:
        Root logger instance, configured with JSON formatting.
    """

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # JSON formatter for stdout (structured, machine-readable)
    json_formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s"
    )

    # Stdout handler (picked up by `docker logs`)
    stdout_handler = logging.StreamHandler()
    stdout_handler.setFormatter(json_formatter)
    logger.addHandler(stdout_handler)

    # Lambda's deployment directory is read-only. CloudWatch captures stdout,
    # so only local/container runs need the rotating file handler.
    if not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        os.makedirs("logs", exist_ok=True)

        file_handler = logging.handlers.RotatingFileHandler(
            "logs/app.log",
            maxBytes=10_000_000,  # 10MB
            backupCount=5,
        )
        file_handler.setFormatter(json_formatter)
        logger.addHandler(file_handler)

    return logger
