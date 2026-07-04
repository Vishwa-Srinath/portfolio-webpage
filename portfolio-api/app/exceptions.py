class AppException(Exception):
    """Base exception for all app-specific errors"""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class RateLimitException(AppException):
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(429, detail)


class ValidationException(AppException):
    def __init__(self, detail: str):
        super().__init__(422, detail)


class NotFoundError(AppException):
    def __init__(self, detail: str = "Not found"):
        super().__init__(404, detail)
