export type PosterSize = "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w780" | "w1280" | "original";
export type ProfileSize = "w185" | "h632" | "original";

export function tmdbImage(path: string | null, size: PosterSize | BackdropSize | ProfileSize = "w500"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path.startsWith("/") ? path : `/${path}`}`;
}

export function youtubeThumbnail(key: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(key)}/hqdefault.jpg`;
}
