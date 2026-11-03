import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleApiError } from "@/lib/api";
import { getRequestId, REQUEST_ID_HEADER } from "@/lib/observability";
import { publicError } from "@/lib/public-api";
import { middleware } from "@/middleware";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe("request correlation and structured logging", () => {
  it("preserves bounded incoming IDs and replaces invalid values", () => {
    const valid = new NextRequest("http://localhost/api/health", { headers: { [REQUEST_ID_HEADER]: "phase2-request-1" } });
    expect(getRequestId(valid)).toBe("phase2-request-1");

    for (const supplied of ["short", "contains spaces", `x${"a".repeat(200)}`]) {
      const request = new NextRequest("http://localhost/api/health", { headers: { [REQUEST_ID_HEADER]: supplied } });
      const generated = getRequestId(request);
      expect(generated).not.toBe(supplied);
      expect(generated).toMatch(/^[a-f0-9-]{36}$/);
    }
  });

  it("adds the same validated ID to middleware responses", () => {
    const response = middleware(new NextRequest("http://localhost/api/health?private=yes", {
      headers: { [REQUEST_ID_HEADER]: "middleware-request-1" },
    }));
    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("middleware-request-1");
  });

  it("logs a safe JSON error with the response request ID and no query or error details", async () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new NextRequest("http://localhost/api/example?access_token=do-not-log", {
      headers: { [REQUEST_ID_HEADER]: "safe-request-1" },
    });
    const response = handleApiError(new Error("sensitive database detail"), request);

    expect(response.status).toBe(500);
    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("safe-request-1");
    expect((await response.json()).error).toEqual({ code: "INTERNAL_ERROR", message: "The request could not be completed." });
    expect(output).toHaveBeenCalledTimes(1);
    const line = output.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(line);
    expect(entry).toMatchObject({
      level: "error",
      event: "request.unhandled_error",
      requestId: "safe-request-1",
      method: "GET",
      route: "/api/example",
      status: 500,
      code: "INTERNAL_ERROR",
      errorName: "Error",
    });
    expect(line).not.toContain("do-not-log");
    expect(line).not.toContain("sensitive database detail");
  });

  it("maps public provider failures without logging provider response details", async () => {
    const output = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new NextRequest("http://localhost/api/public/discover?api_key=do-not-log", {
      headers: { [REQUEST_ID_HEADER]: "discovery-request-1" },
    });
    const response = publicError(new Error("upstream secret"), request);

    expect(response.status).toBe(503);
    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("discovery-request-1");
    expect((await response.json()).error.code).toBe("DISCOVERY_UNAVAILABLE");
    const line = output.mock.calls[0]?.[0] as string;
    expect(JSON.parse(line)).toMatchObject({ event: "discovery.unavailable", requestId: "discovery-request-1", route: "/api/public/discover" });
    expect(line).not.toContain("do-not-log");
    expect(line).not.toContain("upstream secret");
  });
});
