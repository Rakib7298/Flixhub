import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import { Transcoder } from "./jobs";
import type { TranscodeRequest } from "./types";

const apiKey = process.env.TRANSCODER_WORKER_API_KEY;
if (!apiKey || apiKey.length < 32) throw new Error("TRANSCODER_WORKER_API_KEY with at least 32 characters is required.");
const port = Number(process.env.TRANSCODER_PORT || 4100);
const root = path.resolve(process.env.TRANSCODER_STORAGE_ROOT || "./data/transcoder");
const transcoder = new Transcoder(root, {
  maxBytes: Number(process.env.TRANSCODER_MAX_FILE_BYTES || 2_147_483_648),
  timeoutMs: Number(process.env.TRANSCODER_JOB_TIMEOUT_MS || 900_000),
  maxConcurrent: Math.min(Math.max(Number(process.env.TRANSCODER_MAX_CONCURRENT || 1), 1), 2),
  allowPrivateNetwork: process.env.TRANSCODER_ALLOW_PRIVATE_NETWORK === "true",
});
await transcoder.init();

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(request.url || "/", "http://worker.internal");
    if (request.method === "GET" && url.pathname === "/health") return json(response, transcoder.store.healthy ? 200 : 503, { status: transcoder.store.healthy ? "ok" : "degraded", version: "1.0.0", persistence: transcoder.store.healthy ? "ok" : "failed", jobs: transcoder.store.list().filter((job) => ["QUEUED", "RUNNING"].includes(job.status)).length });
    if (!authorized(request.headers.authorization)) return json(response, 401, { error: { code: "UNAUTHORIZED", message: "Valid worker credentials are required." } });
    if (request.method === "POST" && url.pathname === "/api/jobs") {
      const body = await readJson(request);
      const input = validateJob(body);
      const job = transcoder.submit(input);
      return json(response, 202, { job });
    }
    if (request.method === "GET" && url.pathname === "/api/jobs") return json(response, 200, { jobs: transcoder.store.list() });
    const status = /^\/api\/jobs\/([a-f0-9-]{36})\/status$/.exec(url.pathname);
    if (request.method === "GET" && status) { const job = transcoder.store.get(status[1]!); return job ? json(response, 200, { job }) : json(response, 404, { error: { code: "NOT_FOUND", message: "Job not found." } }); }
    const cancel = /^\/api\/jobs\/([a-f0-9-]{36})\/cancel$/.exec(url.pathname);
    if (request.method === "POST" && cancel) { const job = transcoder.cancel(cancel[1]!); return json(response, 200, { job }); }
    return json(response, 404, { error: { code: "NOT_FOUND", message: "Endpoint not found." } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = /queue is full/.test(message) ? 429 : /JSON|required|invalid|confirmed|preset|crf|URL/i.test(message) ? 400 : 500;
    return json(response, status, { error: { code: status === 400 ? "VALIDATION_ERROR" : "WORKER_ERROR", message: message.slice(0, 300) } });
  }
});

function authorized(header: string | undefined) {
  const provided = Buffer.from(header?.replace(/^Bearer /, "") || ""); const expected = Buffer.from(apiKey!);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
function validateJob(body: unknown): TranscodeRequest {
  if (!body || typeof body !== "object") throw new Error("A JSON job is required.");
  const input = body as Record<string, unknown>;
  if (input.authorizationConfirmed !== true) throw new Error("authorizationConfirmed must be true; only submit media you are authorized to process.");
  if (typeof input.inputUrl !== "string" || input.inputUrl.length > 2048) throw new Error("A valid inputUrl is required.");
  const url = new URL(input.inputUrl); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("inputUrl must be HTTP(S) without embedded credentials.");
  const preset = input.preset ?? "veryfast"; if (!["veryfast", "faster", "fast"].includes(String(preset))) throw new Error("Invalid preset.");
  const crf = input.crf === undefined ? 23 : Number(input.crf); if (!Number.isInteger(crf) || crf < 18 || crf > 35) throw new Error("crf must be an integer from 18 to 35.");
  return { inputUrl: input.inputUrl, authorizationConfirmed: true, thumbnail: input.thumbnail === true, preset: preset as NonNullable<TranscodeRequest["preset"]>, crf };
}
async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const length = Number(request.headers["content-length"] || 0); if (length > 65_536) throw new Error("JSON body is too large.");
  const chunks: Buffer[] = []; let total = 0;
  for await (const chunk of request) { const buffer = Buffer.from(chunk); total += buffer.length; if (total > 65_536) throw new Error("JSON body is too large."); chunks.push(buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new Error("Invalid JSON body."); }
}
function json(response: import("node:http").ServerResponse, status: number, body: unknown) { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body)); }

server.listen(port, "0.0.0.0", () => console.log(`MediaMatrix transcoder listening on port ${port}`));
function shutdown() { server.close(() => { void transcoder.store.flush().catch(() => undefined).finally(() => process.exit(0)); }); setTimeout(() => process.exit(1), 10_000).unref(); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
