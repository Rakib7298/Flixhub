import { describe, expect, it } from "vitest";
import { detectPlaybackFormat, playableSourceError, playbackErrorMessage } from "../../packages/media-engine/src/index";
import { clamp, formatRuntime, releaseYear } from "../../packages/shared/src/index";

describe("playback source handling", () => {
  it("detects formats from URL paths, not query strings", () => {
    expect(detectPlaybackFormat("https://media.example.com/live/channel.m3u8?token=redacted")).toBe("hls");
    expect(detectPlaybackFormat("https://media.example.com/movie.mp4")).toBe("mp4");
    expect(detectPlaybackFormat("https://media.example.com/manifest.mpd")).toBe("dash");
    expect(detectPlaybackFormat("https://media.example.com/watch?id=x")).toBe("unknown");
  });
  it("rejects embedded credentials and unsafe schemes", () => {
    expect(playableSourceError("https://user:secret@example.com/movie.mp4")).toMatch(/Credentials/);
    expect(playableSourceError("file:///etc/passwd")).toMatch(/HTTP/);
    expect(playableSourceError("not a URL")).toMatch(/invalid/);
    expect(playableSourceError("https://media.example.com/authorized.m3u8")).toBeNull();
  });
  it("returns honest generic playback errors", () => {
    expect(playbackErrorMessage(new Error("network unreachable"))).toMatch(/could not be reached/i);
    expect(playbackErrorMessage(new Error("decode"))).toMatch(/could not be played/i);
  });
});

describe("shared display helpers", () => {
  it("formats runtime and release years without inventing metadata", () => {
    expect(formatRuntime(130)).toBe("2h 10m"); expect(formatRuntime(0)).toBe("Runtime unavailable"); expect(releaseYear(null)).toBe("TBA"); expect(releaseYear("2026-04-01")).toBe("2026");
  });
  it("clamps numeric values", () => expect(clamp(20, 1, 10)).toBe(10));
});
