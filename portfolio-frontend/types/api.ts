// Request/response shapes matching the FastAPI backend

export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  honeypot: string;
}

export interface ContactResponse {
  success: boolean;
  id: string;
  message?: string;
}

export interface EventRequest {
  event_name: string;
  page: string;
  metadata?: Record<string, unknown>;
}

export interface EventResponse {
  success: boolean;
  id: string;
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  database: string;
}

export interface ApiErrorResponse {
  detail: string;
}
