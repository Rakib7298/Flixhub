import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

function request(forwardedFor?: string) {
  return new NextRequest("http://localhost/api/auth/register", {
    headers: {
      "x-request-id": "rate-limit-request-1",
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
  });
}

beforeEach(() => {
  resetRateLimitsForTests();
  vi.stubEnv("TRUST_PROXY", "false");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("NETLIFY", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  resetRateLimitsForTests();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("shared process-local rate limiting", () => {
  it("enforces the configured window and returns safe retry/correlation headers", async () => {
    expect(rateLimit(request(), "test", { limit: 2, windowMs: 60_000 })).toBeNull();
    expect(rateLimit(request(), "test", { limit: 2, windowMs: 60_000 })).toBeNull();
    const limited = rateLimit(request(), "test", { limit: 2, windowMs: 60_000 });

    expect(limited?.status).toBe(429);
    expect(Number(limited?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(limited?.headers.get("cache-control")).toBe("no-store");
    expect(limited?.headers.get("x-request-id")).toBe("rate-limit-request-1");
    expect((await limited!.json()).error.code).toBe("RATE_LIMITED");
  });

  it("keeps scopes independent and starts a fresh bucket after expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T00:00:00Z"));
    expect(rateLimit(request(), "one", { limit: 1, windowMs: 1_000 })).toBeNull();
    expect(rateLimit(request(), "two", { limit: 1, windowMs: 1_000 })).toBeNull();
    expect(rateLimit(request(), "one", { limit: 1, windowMs: 1_000 })?.status).toBe(429);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(request(), "one", { limit: 1, windowMs: 1_000 })).toBeNull();
  });

  it("ignores spoofed forwarding headers unless proxy trust is explicit", () => {
    expect(rateLimit(request("192.0.2.1"), "spoof", { limit: 1, windowMs: 60_000 })).toBeNull();
    expect(rateLimit(request("192.0.2.2"), "spoof", { limit: 1, windowMs: 60_000 })?.status).toBe(429);
  });

  it("uses the first forwarded address only behind a trusted proxy and does not log the IP", async () => {
    vi.stubEnv("TRUST_PROXY", "true");
    expect(rateLimit(request("192.0.2.1, 198.51.100.1"), "trusted", { limit: 1, windowMs: 60_000 })).toBeNull();
    expect(rateLimit(request("192.0.2.2"), "trusted", { limit: 1, windowMs: 60_000 })).toBeNull();
    expect(rateLimit(request("192.0.2.1"), "trusted", { limit: 1, windowMs: 60_000 })?.status).toBe(429);

    const output = vi.mocked(console.warn).mock.calls.at(-1)?.[0] as string;
    expect(JSON.parse(output)).toMatchObject({ event: "rate_limit.exceeded", scope: "trusted", requestId: "rate-limit-request-1" });
    expect(output).not.toContain("192.0.2.1");
  });
});
