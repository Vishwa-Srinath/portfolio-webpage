// Typed fetch wrapper for FastAPI backend
// All API calls go through this — consistent error handling and typing

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

// Analytics event logger — fire-and-forget, never breaks the app
export async function logEvent(
  eventName: string,
  page: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_API_URL) return;

  try {
    await fetch(`${API_URL}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        page,
        metadata: metadata || {},
      }),
    });
  } catch {
    // Silently fail — analytics should never break the app
    console.debug("Analytics logging failed");
  }
}
