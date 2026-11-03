import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock("@mediamatrix/database", () => ({ db: { $queryRaw: mocks.queryRaw } }));

import { GET } from "../../apps/web/app/api/health/route";

const environmentKeys = [
  "DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "TMDB_API_KEY", "TMDB_ACCESS_TOKEN",
  "STREAMING_AVAILABILITY_API_KEY", "STREAMING_API_PROVIDER", "SMTP_URL",
  "TRANSCODER_WORKER_URL", "TRANSCODER_WORKER_API_KEY", "JELLYFIN_SERVER_URL",
  "JELLYFIN_API_KEY", "JELLYFIN_USER_ID", "GITHUB_TOKEN",
] as const;
const original = new Map<string, string | undefined>();

beforeEach(() => {
  mocks.queryRaw.mockReset();
  for (const key of environmentKeys) {
    original.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of environmentKeys) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  original.clear();
});

describe("health endpoint", () => {
  it("reports a non-secret degraded state when the foundation is unconfigured", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.status).toBe("degraded");
    expect(body.checks.databaseReachable).toBeNull();
    expect(body.checks.database).toBe(false);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("is ready only when authentication is configured and PostgreSQL responds", async () => {
    process.env.DATABASE_URL = "postgresql://user:private-password@localhost/mediamatrix";
    const secret = "a".repeat(32);
    process.env.AUTH_SECRET = secret;
    mocks.queryRaw.mockResolvedValue([{ ready: 1 }]);
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks.databaseReachable).toBe(true);
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
    expect(JSON.stringify(body)).not.toContain("private-password");
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  it("fails closed to degraded when the configured database is unreachable", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/unreachable";
    process.env.AUTH_SECRET = "b".repeat(32);
    mocks.queryRaw.mockRejectedValue(new Error("private database details"));
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.databaseReachable).toBe(false);
    expect(JSON.stringify(body)).not.toContain("private database details");
  });
});
