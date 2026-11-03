import { createHash } from "node:crypto";
import type { PlaylistChannel } from "@mediamatrix/shared";

export interface PlaylistIssue { line: number; message: string }
export interface ParsedPlaylist { channels: PlaylistChannel[]; issues: PlaylistIssue[]; duplicateCount: number; entryCount: number }

export function parseM3U(input: string, options: { maxChannels?: number } = {}): ParsedPlaylist {
  if (typeof input !== "string" || input.length === 0) throw new Error("The playlist is empty.");
  const maxChannels = options.maxChannels ?? 20_000;
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.length > 200_000) throw new Error("The playlist has too many lines.");
  if (!lines.some((line) => line.trim())) throw new Error("The playlist is empty.");
  if (lines[0]?.trim() !== "#EXTM3U") throw new Error("The playlist must begin with #EXTM3U.");
  if (lines.some((line) => /#EXT-X-(TARGETDURATION|MEDIA-SEQUENCE|PLAYLIST-TYPE)/.test(line))) throw new Error("This is an HLS media playlist, not a channel list. Add its direct URL to the player instead.");

  const channels: PlaylistChannel[] = [];
  const issues: PlaylistIssue[] = [];
  const seen = new Map<string, number>();
  let duplicateCount = 0;
  let entryCount = 0;
  let pending: { line: number; attributes: Record<string, string>; name: string; group: string } | null = null;

  for (let index = 1; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = lines[index]?.trim() ?? "";
    if (line.length > 8192) { issues.push({ line: lineNumber, message: "Line exceeds 8 KiB and was skipped." }); pending = null; continue; }
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      if (pending) issues.push({ line: pending.line, message: "EXTINF entry has no stream URL." });
      entryCount++;
      pending = parseExtInf(line, lineNumber);
      if (entryCount > maxChannels * 2) throw new Error("The playlist contains too many entries.");
      continue;
    }
    if (line.startsWith("#EXTGRP:")) {
      if (pending) pending.group = line.slice(8).trim().slice(0, 200) || pending.group;
      continue;
    }
    if (line.startsWith("#")) continue;
    if (!pending) { issues.push({ line: lineNumber, message: "Stream URL has no preceding EXTINF entry." }); continue; }
    const current = pending;
    pending = null;
    const stream = safeHttpUrl(line);
    if (!stream || channels.length >= maxChannels) {
      issues.push({ line: lineNumber, message: channels.length >= maxChannels ? "Channel limit reached." : "Stream URL must be valid HTTP(S) without embedded credentials." });
      continue;
    }
    const name = current.name || current.attributes["tvg-name"] || `Channel ${entryCount}`;
    const channelKey = createHash("sha256").update(stream).digest("hex").slice(0, 32);
    if (seen.has(channelKey)) {
      duplicateCount++;
      issues.push({ line: lineNumber, message: `Duplicate of an entry on line ${seen.get(channelKey)}.` });
      continue;
    }
    seen.set(channelKey, lineNumber);
    const logo = safeHttpUrl(current.attributes["tvg-logo"] || "", false);
    channels.push({
      id: channelKey,
      name: name.slice(0, 300),
      url: stream,
      logo,
      group: (current.attributes["group-title"] || current.group || "Uncategorized").slice(0, 200),
      tvgId: current.attributes["tvg-id"]?.slice(0, 200) || null,
      rawMetadata: current.attributes,
    });
  }
  if (pending) issues.push({ line: pending.line, message: "Final EXTINF entry has no stream URL." });
  return { channels, issues: issues.slice(0, 200), duplicateCount, entryCount };
}

function parseExtInf(line: string, lineNumber: number) {
  const body = line.slice(8);
  const comma = findMetadataEnd(body);
  const metadata = comma >= 0 ? body.slice(0, comma) : body;
  const name = comma >= 0 ? body.slice(comma + 1).trim() : "";
  const attributes: Record<string, string> = {};
  const attributePattern = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(metadata))) {
    const key = match[1]?.toLowerCase();
    if (key) attributes[key] = (match[2] ?? match[3] ?? match[4] ?? "").slice(0, 2048);
  }
  if (!name && !attributes["tvg-name"]) return { line: lineNumber, attributes, name: "", group: "Uncategorized" };
  return { line: lineNumber, attributes, name, group: "Uncategorized" };
}

function findMetadataEnd(value: string): number {
  let quote = "";
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") quote = quote === char ? "" : quote || char;
    if (char === "," && !quote) return index;
  }
  return -1;
}

function safeHttpUrl(value: string, allowEmpty = true): string | null {
  if (!value) return allowEmpty ? null : null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.toString().length > 2048) return null;
    return url.toString();
  } catch { return null; }
}
