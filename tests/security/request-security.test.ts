import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, assertSameOrigin, parseBody } from "../../apps/web/lib/api";
import { rateLimit, resetRateLimitsForTests } from "../../apps/web/lib/rate-limit";

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
beforeEach(() => { process.env.NEXT_PUBLIC_APP_URL = "https://media.example.com"; resetRateLimitsForTests(); delete process.env.VERCEL; delete process.env.NETLIFY; delete process.env.TRUST_PROXY; });
afterEach(() => { if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = originalUrl; });

describe("request origin and body defenses", () => {
  it("rejects cross-site and mismatched-origin mutations", () => {
    expect(() => assertSameOrigin(new NextRequest("https://media.example.com/api/user/profile", { headers: { "sec-fetch-site": "cross-site" } }))).toThrowError(expect.objectContaining({ code: "CSRF_REJECTED" }));
    expect(() => assertSameOrigin(new NextRequest("https://media.example.com/api/user/profile", { headers: { origin: "https://attacker.example" } }))).toThrowError(expect.objectContaining({ status: 403 }));
    expect(() => assertSameOrigin(new NextRequest("https://media.example.com/api/user/profile", { headers: { origin: "https://media.example.com", "sec-fetch-site": "same-origin" } }))).not.toThrow();
  });
  it("enforces body limits and schemas", async () => {
    const large = new NextRequest("https://media.example.com/api", { method: "POST", headers: { "content-length": "100" }, body: "{}" });
    await expect(parseBody(large, z.object({}), 10)).rejects.toMatchObject({ status: 413 });
    const invalid = new NextRequest("https://media.example.com/api", { method: "POST", body: JSON.stringify({ name: 3 }) });
    await expect(parseBody(invalid, z.object({ name: z.string() }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(100)); controller.close(); } });
    const chunked = new NextRequest("https://media.example.com/api", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(parseBody(chunked, z.object({}), 10)).rejects.toMatchObject({ status: 413 });
  });
  it("does not expose internal error details", () => expect(new ApiError(400, "BAD", "Safe message")).toMatchObject({ status: 400, code: "BAD" }));
});

describe("rate limiting", () => {
  it("limits repeated requests and emits Retry-After", () => {
    const request = () => new NextRequest("https://media.example.com/api", { headers: { "x-real-ip": "203.0.113.10" } });
    expect(rateLimit(request(), "test", { limit: 1, windowMs: 60_000 })).toBeNull(); const limited = rateLimit(request(), "test", { limit: 1, windowMs: 60_000 }); expect(limited?.status).toBe(429); expect(Number(limited?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
  it("ignores spoofed forwarding headers unless a proxy is trusted", () => {
    const first = new NextRequest("https://media.example.com/api", { headers: { "x-forwarded-for": "198.51.100.1" } }); const second = new NextRequest("https://media.example.com/api", { headers: { "x-forwarded-for": "198.51.100.2" } });
    expect(rateLimit(first, "spoof", { limit: 1, windowMs: 60_000 })).toBeNull(); expect(rateLimit(second, "spoof", { limit: 1, windowMs: 60_000 })?.status).toBe(429);
  });
});
