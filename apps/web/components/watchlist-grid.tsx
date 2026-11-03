"use client";

import { useState } from "react";
import type { MediaSummary } from "@mediamatrix/shared";
import { EmptyState } from "@mediamatrix/ui";
import { MediaCard } from "./media-card";
import { WatchlistButton } from "./watchlist-button";
import { FavoriteButton } from "./favorite-button";

export interface WatchlistItem { mediaKey: string; mediaType: "movie" | "tv"; tmdbId: number; title: string; posterPath: string | null; releaseDate?: string | null }

export function WatchlistGrid({ initialItems, mode = "watchlist" }: { initialItems: WatchlistItem[]; mode?: "watchlist" | "favorites" }) {
  const [items, setItems] = useState(initialItems);
  if (!items.length) return <EmptyState title={mode === "watchlist" ? "Your list is ready for a first story" : "No favorite titles yet"} description={mode === "watchlist" ? "Explore movies or series and select Add to list. Your saved titles will appear here." : "Use the Favorite action on a movie or series to keep it in this personal collection."} />;
  return <div className="grid grid-cols-2 gap-x-3 gap-y-8 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{items.map((item) => { const media: MediaSummary = { id: item.tmdbId, type: item.mediaType, title: item.title, originalTitle: item.title, overview: "", posterPath: item.posterPath, backdropPath: null, releaseDate: item.releaseDate ?? null, rating: 0, voteCount: 0, genreIds: [], popularity: 0 }; const onSavedChange = (saved: boolean) => { if (!saved) setItems((current) => current.filter((candidate) => candidate.mediaKey !== item.mediaKey)); }; return <div key={item.mediaKey}><MediaCard media={media} compact /><div className="mt-2 [&_button]:min-h-9 [&_button]:w-full [&_button]:px-3 [&_button]:text-xs">{mode === "watchlist" ? <WatchlistButton mediaType={item.mediaType} tmdbId={item.tmdbId} title={item.title} posterPath={item.posterPath} initialSaved onSavedChange={onSavedChange} /> : <FavoriteButton mediaType={item.mediaType} tmdbId={item.tmdbId} title={item.title} posterPath={item.posterPath} initialSaved onSavedChange={onSavedChange} />}</div></div>; })}</div>;
}
