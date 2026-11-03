import { createHash } from "node:crypto";

export interface GithubPlaylistRequest { repository: string; branch: string; path: string; token?: string; maxBytes?: number; timeoutMs?: number }
export interface GithubPlaylistResult { content: string; sha: string; contentHash: string; bytes: number }

export class GithubSyncError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "GITHUB_SYNC_ERROR") { super(message); this.name = "GithubSyncError"; }
}

export async function fetchGithubPlaylist(request: GithubPlaylistRequest, fetchImpl: typeof fetch = fetch): Promise<GithubPlaylistResult> {
  const { owner, repository, branch, path } = validateGithubLocation(request);
  const maxBytes = request.maxBytes ?? 5 * 1024 * 1024;
  const endpoint = new URL(`https://api.github.com/repos/${owner}/${repository}/contents/${path.split("/").map(encodeURIComponent).join("/")}`);
  endpoint.searchParams.set("ref", branch);
  const commonHeaders = githubHeaders(request.token);
  const metadataResponse = await requestGithub(endpoint, { ...commonHeaders, Accept: "application/vnd.github+json" }, fetchImpl, request.timeoutMs ?? 15_000);
  const metadata = await metadataResponse.json() as Record<string, unknown>;
  if (metadata.type !== "file" || typeof metadata.sha !== "string") throw new GithubSyncError("The configured GitHub path is not a file.");
  if (typeof metadata.size === "number" && metadata.size > maxBytes) throw new GithubSyncError("The GitHub playlist exceeds the configured size limit.", 413, "TOO_LARGE");

  const contentResponse = await requestGithub(endpoint, { ...commonHeaders, Accept: "application/vnd.github.raw+json" }, fetchImpl, request.timeoutMs ?? 15_000);
  const buffer = await readLimited(contentResponse, maxBytes);
  let content: string;
  try { content = new TextDecoder("utf-8", { fatal: true }).decode(buffer); } catch { throw new GithubSyncError("The GitHub playlist must be valid UTF-8 text."); }
  return { content, sha: metadata.sha, contentHash: createHash("sha256").update(buffer).digest("hex"), bytes: buffer.byteLength };
}

export function validateGithubLocation(request: GithubPlaylistRequest) {
  const match = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}))\/([a-zA-Z0-9_.-]{1,100})$/.exec(request.repository);
  if (!match) throw new GithubSyncError("Repository must use the owner/repository format.");
  const invalidBranch = !request.branch || request.branch.length > 200 || /[\s~^:?*]/.test(request.branch) || ["\\", "[", "]", "..", "@{"].some((part) => request.branch.includes(part)) || request.branch.startsWith("/") || request.branch.endsWith("/");
  if (invalidBranch) throw new GithubSyncError("The configured Git branch is invalid.");
  if (!request.path || request.path.length > 400 || request.path.startsWith("/") || request.path.includes("\\") || request.path.split("/").some((part) => !part || part === "." || part === "..")) throw new GithubSyncError("The playlist file path is invalid.");
  return { owner: match[1]!, repository: match[2]!, branch: request.branch, path: request.path };
}

function githubHeaders(token?: string): Record<string, string> {
  return { "User-Agent": "MediaMatrix-GitHub-Sync/1.0", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function requestGithub(url: URL, headers: Record<string, string>, fetchImpl: typeof fetch, timeoutMs: number): Promise<Response> {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers, signal: controller.signal, redirect: "error", cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404) throw new GithubSyncError("The GitHub repository or file was not found, or the configured token cannot access it.", 404, "NOT_FOUND");
      if (response.status === 401 || response.status === 403) throw new GithubSyncError("GitHub rejected the credentials or API rate limits.", 502, "AUTH_OR_RATE_LIMIT");
      if (response.status === 429 || response.status >= 500) throw new GithubSyncError("GitHub is temporarily unavailable.", 503, "UPSTREAM_UNAVAILABLE");
      throw new GithubSyncError(`GitHub returned HTTP ${response.status}.`, 502, "UPSTREAM_ERROR");
    }
    return response;
  } catch (error) {
    if (error instanceof GithubSyncError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new GithubSyncError("GitHub synchronization timed out.", 503, "TIMEOUT");
    throw new GithubSyncError("GitHub could not be reached.", 503, "UPSTREAM_UNAVAILABLE");
  } finally { clearTimeout(timeout); }
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) throw new GithubSyncError("GitHub returned an empty file.");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break; if (!value) continue;
      total += value.byteLength; if (total > maxBytes) throw new GithubSyncError("The GitHub playlist exceeds the configured size limit.", 413, "TOO_LARGE");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}
