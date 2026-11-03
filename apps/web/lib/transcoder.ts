import { ApiError } from "./api";

export async function transcoderRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.TRANSCODER_WORKER_URL;
  const apiKey = process.env.TRANSCODER_WORKER_API_KEY;
  if (!baseUrl || !apiKey) throw new ApiError(503, "TRANSCODER_NOT_CONFIGURED", "TRANSCODER_WORKER_URL and TRANSCODER_WORKER_API_KEY are required for transcoding.");
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...init.headers }, signal: controller.signal, cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message || `Transcoder returned HTTP ${response.status}.`);
    return body as T;
  } finally { clearTimeout(timeout); }
}
