import { describe, expect, it } from "vitest";
import { parseM3U } from "../../services/playlist-manager/src/index";

const valid = `#EXTM3U
#EXTINF:-1 tvg-id="news.one" tvg-logo="https://img.example.com/logo.png" group-title="News, World",Channel One
#EXTGRP:Live News
https://streams.example.com/one.m3u8
#EXTINF:-1,Channel One duplicate
https://streams.example.com/one.m3u8
#EXTINF:-1,Unsafe
javascript:alert(1)
#EXTINF:-1,Embedded credentials
https://user:pass@streams.example.com/two.m3u8
#EXTINF:-1 group-title="Movies",Channel Two
https://streams.example.com/two.m3u8`;

describe("M3U channel parser", () => {
  it("parses metadata, preserves groups, and rejects duplicates and unsafe URLs", () => {
    const result = parseM3U(valid);
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0]).toMatchObject({ name: "Channel One", group: "News, World", tvgId: "news.one" });
    expect(result.channels[1]?.group).toBe("Movies");
    expect(result.duplicateCount).toBe(1);
    expect(result.entryCount).toBe(5);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
  it("rejects HLS media playlists instead of presenting segments as channels", () => {
    expect(() => parseM3U("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nsegment.ts")).toThrow(/not a channel list/);
  });
  it("requires the M3U header and reports orphan stream URLs", () => {
    expect(() => parseM3U("https://example.com/a.m3u8")).toThrow(/must begin/);
    const result = parseM3U("#EXTM3U\nhttps://example.com/a.m3u8");
    expect(result.channels).toHaveLength(0); expect(result.issues[0]?.message).toMatch(/no preceding/);
  });
  it("enforces channel limits", () => {
    const limited = "#EXTM3U\n#EXTINF:-1,One\nhttps://streams.example.com/one.m3u8\n#EXTINF:-1,Two\nhttps://streams.example.com/two.m3u8";
    const result = parseM3U(limited, { maxChannels: 1 }); expect(result.channels).toHaveLength(1); expect(result.issues.some((issue) => /limit/.test(issue.message))).toBe(true);
  });
});
