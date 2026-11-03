import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasSensitiveUrlParameters, isPublicIp, validateRemoteUrlSyntax } from "../../services/playlist-manager/src/index";
import { decryptSecret, encryptSecret, safeSourceLabel, sensitiveHash } from "../../apps/web/lib/security";

describe("remote source defenses", () => {
  it("rejects local, private, reserved, and embedded-credential URLs", () => {
    for (const value of ["http://localhost/a.m3u", "http://127.0.0.1/a.m3u", "http://10.0.0.1/a.m3u", "http://169.254.169.254/latest", "http://[::1]/a.m3u", "https://user:pass@example.com/a.m3u", "file:///etc/passwd"]) expect(() => validateRemoteUrlSyntax(value)).toThrow();
    expect(validateRemoteUrlSyntax("https://8.8.8.8/authorized.m3u").hostname).toBe("8.8.8.8");
  });
  it("identifies public and non-public IPs", () => {
    expect(isPublicIp("8.8.8.8")).toBe(true); expect(isPublicIp("192.168.1.1")).toBe(false); expect(isPublicIp("::1")).toBe(false); expect(isPublicIp("not-an-ip")).toBe(false);
  });
  it("detects credential-like query parameters", () => {
    expect(hasSensitiveUrlParameters("https://example.com/a?token=secret")).toBe(true); expect(hasSensitiveUrlParameters("https://example.com/a?api_key=secret")).toBe(true); expect(hasSensitiveUrlParameters("https://example.com/a?channel=news")).toBe(false);
  });
});

describe("encrypted source storage", () => {
  const original = process.env.AUTH_SECRET;
  beforeEach(() => { process.env.AUTH_SECRET = "test-only-secret-with-at-least-32-characters"; });
  afterEach(() => { if (original === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = original; });
  it("round-trips AES-GCM values and rejects tampering", () => {
    const encrypted = encryptSecret("https://example.com/a?token=secret"); expect(encrypted).not.toContain("token"); expect(decryptSecret(encrypted)).toBe("https://example.com/a?token=secret");
    const tampered = `${encrypted.slice(0, -2)}xx`; expect(() => decryptSecret(tampered)).toThrow();
  });
  it("uses deterministic keyed fingerprints and redacts query strings", () => {
    expect(sensitiveHash("value")).toBe(sensitiveHash("value")); expect(sensitiveHash("value")).not.toBe(sensitiveHash("other")); expect(safeSourceLabel("https://user:pass@example.com/path?token=secret")).toBe("https://example.com/path");
  });
});
