import { createHash } from "node:crypto";
import { lookup } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { assertSafeRemoteUrl, isPublicIp, type RemoteUrlOptions } from "./security";

export interface FetchPlaylistOptions extends RemoteUrlOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
}
export interface FetchedPlaylist { content: string; finalUrl: string; contentHash: string; bytes: number }

export async function fetchPlaylist(source: string, options: FetchPlaylistOptions = {}): Promise<FetchedPlaylist> {
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const agent = options.fetchImpl ? null : new Agent({ connect: { lookup: secureLookup(options.allowPrivateNetwork ?? false) } });
  let current = source;
  try {
    for (let redirect = 0; redirect <= maxRedirects; redirect++) {
      const url = await assertSafeRemoteUrl(current, options);
      const fetchImpl = options.fetchImpl ?? (undiciFetch as unknown as typeof fetch);
      const response = await fetchImpl(url, {
        headers: { Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, audio/mpegurl, text/plain;q=0.9, */*;q=0.1", "User-Agent": "MediaMatrix-Playlist-Validator/1.0" },
        redirect: "manual",
        signal: controller.signal,
        ...(agent ? { dispatcher: agent } : {}),
      } as RequestInit);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        if (redirect === maxRedirects) throw new Error("Too many playlist redirects.");
        const location = response.headers.get("location");
        if (!location) throw new Error("Playlist redirect has no destination.");
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Playlist download failed with HTTP ${response.status}.`); }
      const length = Number(response.headers.get("content-length") || 0);
      if (length > maxBytes) { await response.body?.cancel(); throw new Error("Playlist exceeds the configured download size limit."); }
      const contentType = response.headers.get("content-type")?.toLowerCase() || "";
      if (contentType.includes("text/html")) { await response.body?.cancel(); throw new Error("The source returned HTML instead of a playlist."); }
      const buffer = await readLimited(response, maxBytes);
      const content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (content.trimStart().startsWith("<")) throw new Error("The source returned markup instead of a playlist.");
      return { content, finalUrl: url.toString(), contentHash: createHash("sha256").update(buffer).digest("hex"), bytes: buffer.byteLength };
    }
    throw new Error("Playlist redirect limit reached.");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Playlist download exceeded the configured time limit.");
    throw error;
  } finally {
    clearTimeout(timeout);
    if (agent) await agent.close();
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) throw new Error("Playlist response is empty.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("Playlist exceeds the configured download size limit.");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function secureLookup(allowPrivate: boolean) {
  return (hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) { callback(error, "", 0); return; }
      const selected = addresses[0];
      if (!selected || (!allowPrivate && addresses.some(({ address }) => !isPublicIp(address)))) {
        const blocked = new Error("Connection-time DNS validation rejected a private or unresolvable address.") as NodeJS.ErrnoException;
        blocked.code = "ENOTALLOWED";
        callback(blocked, "", 0); return;
      }
      callback(null, selected.address, selected.family);
    });
  };
}
