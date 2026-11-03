import type { ApiErrorBody } from "@mediamatrix/shared";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  try {
    const response = await fetch(path, {
      ...options,
      headers,
      credentials: "same-origin",
      signal: options.signal ?? controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
    if (!response.ok) {
      const error = body && typeof body === "object" && "error" in body ? body.error : null;
      throw new ApiClientError(
        error?.message ?? `Request failed with status ${response.status}`,
        response.status,
        error?.code ?? "REQUEST_FAILED",
        error?.details,
      );
    }
    if (body === null) throw new ApiClientError("The server returned an invalid response.", response.status, "INVALID_RESPONSE");
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function jsonBody(value: unknown): Pick<RequestInit, "method" | "body"> {
  return { method: "POST", body: JSON.stringify(value) };
}
