export type PlaybackFormat = "hls" | "mp4" | "dash" | "unknown";

export function detectPlaybackFormat(source: string): PlaybackFormat {
  try {
    const url = new URL(source);
    if (!['https:', 'http:'].includes(url.protocol)) return "unknown";
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".m3u8") || path.endsWith(".m3u")) return "hls";
    if (path.endsWith(".mp4") || path.endsWith(".webm")) return "mp4";
    if (path.endsWith(".mpd")) return "dash";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function supportsNativeHls(video: HTMLVideoElement): boolean {
  return video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

export function playableSourceError(source: string): string | null {
  try {
    const url = new URL(source);
    if (!["https:", "http:"].includes(url.protocol)) return "Only HTTP(S) media sources are supported.";
    if (url.username || url.password) return "Credentials must not be embedded in browser-facing media URLs.";
    return null;
  } catch {
    return "The media source URL is invalid.";
  }
}

export function playbackErrorMessage(error: unknown): string {
  if (error instanceof Error && /network/i.test(error.message)) {
    return "The stream could not be reached. It may be offline or blocked by the provider's CORS policy.";
  }
  return "This stream could not be played in your browser. Try another authorized source or device.";
}
