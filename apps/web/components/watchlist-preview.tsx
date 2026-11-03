"use client";

import { useEffect, useState } from "react";
import type { MediaSummary } from "@mediamatrix/shared";
import { apiRequest } from "@mediamatrix/api-client";
import { MediaCarousel } from "./media-carousel";

interface Item { mediaType: "movie" | "tv"; tmdbId: number; title: string; posterPath: string | null }
export function WatchlistPreview() {
  const [items, setItems] = useState<MediaSummary[]>([]);
  useEffect(() => { apiRequest<{ items: Item[] }>("/api/user/watchlist").then((data) => setItems(data.items.slice(0, 12).map((item) => ({ id: item.tmdbId, type: item.mediaType, title: item.title, originalTitle: item.title, overview: "", posterPath: item.posterPath, backdropPath: null, releaseDate: null, rating: 0, voteCount: 0, genreIds: [], popularity: 0 })))).catch(() => setItems([])); }, []);
  if (!items.length) return null;
  return <MediaCarousel title="From your watchlist" eyebrow="Saved for later" items={items} href="/watchlist" />;
}
