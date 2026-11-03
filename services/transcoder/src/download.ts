import { createHash } from "node:crypto";
import { lookup } from "node:dns";
import { mkdir, open, rename } from "node:fs/promises";
import path from "node:path";
import { Agent, fetch as undiciFetch } from "undici";
import { assertSafeRemoteUrl, isPublicIp } from "@mediamatrix/playlist-manager";

export async function downloadAuthorizedInput(source: string, jobDirectory: string, options: { maxBytes: number; allowPrivateNetwork: boolean; signal: AbortSignal }) {
  await mkdir(jobDirectory, { recursive: true, mode: 0o700 });
  const agent = new Agent({ connect: { lookup: secureLookup(options.allowPrivateNetwork) } });
  let current = source;
  try {
    for (let redirect = 0; redirect <= 3; redirect++) {
      const url = await assertSafeRemoteUrl(current, { allowPrivateNetwork: options.allowPrivateNetwork });
      const response = await undiciFetch(url, { signal: options.signal, dispatcher: agent, redirect: "manual", headers: { "User-Agent": "MediaMatrix-Authorized-Transcoder/1.0" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel(); if (redirect === 3) throw new Error("Too many input redirects.");
        const location = response.headers.get("location"); if (!location) throw new Error("Input redirect has no destination.");
        current = new URL(location, url).toString(); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Input download returned HTTP ${response.status}.`); }
      const length = Number(response.headers.get("content-length") || 0);
      if (length > options.maxBytes) { await response.body?.cancel(); throw new Error("Input exceeds the configured file size limit."); }
      if (!response.body) throw new Error("Input response is empty.");
      const temporary = path.join(jobDirectory, ".download.tmp");
      const target = path.join(jobDirectory, "source.input");
      const file = await open(temporary, "w", 0o600);
      const reader = response.body.getReader(); let total = 0; const hash = createHash("sha256");
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break; if (!value) continue;
          total += value.byteLength; if (total > options.maxBytes) throw new Error("Input exceeds the configured file size limit.");
          hash.update(value); await file.write(value);
        }
      } finally { reader.releaseLock(); await file.close(); }
      if (!total) throw new Error("Downloaded input is empty.");
      await rename(temporary, target);
      return { path: target, bytes: total, sha256: hash.digest("hex") };
    }
    throw new Error("Input redirect limit reached.");
  } finally { await agent.close(); }
}

function secureLookup(allowPrivate: boolean) {
  return (hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) { callback(error, "", 0); return; }
      const selected = addresses[0];
      if (!selected || (!allowPrivate && addresses.some(({ address }) => !isPublicIp(address)))) { const blocked = new Error("Private or unresolvable input address rejected.") as NodeJS.ErrnoException; blocked.code = "ENOTALLOWED"; callback(blocked, "", 0); return; }
      callback(null, selected.address, selected.family);
    });
  };
}
