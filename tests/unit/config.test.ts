import { describe, expect, it } from "vitest";
import { integrationStatus, readServerEnv } from "../../packages/config/src";

describe("server environment foundation", () => {
  it("provides safe local defaults with optional integrations disabled", () => {
    const env = readServerEnv({});
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
    expect(env.PLAYLIST_MAX_BYTES).toBe(5_242_880);
    expect(env.AUTH_TRUST_HOST).toBe(false);
    expect(integrationStatus(env)).toEqual({
      database: false,
      authentication: false,
      tmdb: false,
      streamingAvailability: false,
      passwordRecovery: false,
      transcoder: false,
      jellyfin: false,
      github: false,
    });
  });

  it("validates URLs, booleans and numeric bounds without echoing secret values", () => {
    const secret = "a".repeat(32);
    const env = readServerEnv({
      NEXT_PUBLIC_APP_URL: "https://media.example.com",
      DATABASE_URL: "postgresql://user:private-password@db.example.com/mediamatrix",
      AUTH_SECRET: secret,
      AUTH_TRUST_HOST: "true",
      PLAYLIST_MAX_BYTES: "1024",
    });
    expect(env.AUTH_TRUST_HOST).toBe(true);
    expect(env.PLAYLIST_MAX_BYTES).toBe(1024);
    const status = integrationStatus(env);
    expect(status.database).toBe(true);
    expect(status.authentication).toBe(true);
    expect(JSON.stringify(status)).not.toContain(secret);
    expect(JSON.stringify(status)).not.toContain("private-password");
    expect(() => readServerEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(/NEXT_PUBLIC_APP_URL/);
    expect(() => readServerEnv({ PLAYLIST_MAX_BYTES: "50000001" })).toThrow(/PLAYLIST_MAX_BYTES/);
    expect(() => readServerEnv({ AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("reports only complete integration configurations", () => {
    const env = readServerEnv({
      JELLYFIN_SERVER_URL: "https://jellyfin.example.com",
      JELLYFIN_API_KEY: "private-key",
      TRANSCODER_WORKER_URL: "http://transcoder:4100",
      TRANSCODER_WORKER_API_KEY: "worker-secret",
      STREAMING_AVAILABILITY_API_KEY: "availability-secret",
    });
    const status = integrationStatus(env);
    expect(status.jellyfin).toBe(false);
    expect(status.streamingAvailability).toBe(false);
    expect(status.transcoder).toBe(true);
    expect(JSON.stringify(status)).not.toMatch(/private-key|worker-secret|availability-secret/);
  });
});
