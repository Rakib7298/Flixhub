"use client";

import { useEffect, useState } from "react";
import { Play, ShieldCheck } from "lucide-react";
import { apiRequest } from "@mediamatrix/api-client";
import type { MediaType } from "@mediamatrix/shared";
import { Button, EmptyState, GlassCard } from "@mediamatrix/ui";
import { VideoPlayer } from "./video-player";

interface Source { id: string; label: string; url: string; format: string; requiresAuth: boolean }
export function AuthorizedSources({ type, tmdbId, title, posterPath }: { type: MediaType; tmdbId: number; title: string; posterPath: string | null }) {
  const [items, setItems] = useState<Source[]>([]); const [selected, setSelected] = useState<Source | null>(null); const [loaded, setLoaded] = useState(false); const [error, setError] = useState("");
  useEffect(() => { apiRequest<{ items: Source[] }>(`/api/media-sources?type=${type}&tmdbId=${tmdbId}`).then((data) => { setItems(data.items); setSelected(data.items[0] ?? null); setLoaded(true); }).catch((caught) => { setError(caught instanceof Error ? caught.message : "Direct sources unavailable"); setLoaded(true); }); }, [type, tmdbId]);
  return <section className="py-8"><p className="eyebrow">Your authorized library</p><h2 className="section-title mb-5 mt-1.5">Direct playback sources</h2>{error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}{selected && <><VideoPlayer key={selected.id} source={selected.url} title={title} mediaKey={`${type}:${tmdbId}`} posterPath={posterPath} direct={selected.format === "mp4"} /><div className="mt-4 flex flex-wrap gap-2">{items.map((source) => <Button key={source.id} size="sm" variant={source.id === selected.id ? "primary" : "secondary"} onClick={() => setSelected(source)}><Play size={13} />{source.label}</Button>)}</div></>}{loaded && !items.length && <EmptyState title="No direct sources configured" description="No authorized playback source has been attached to this title. Official provider options above are separate and may still be available." icon={<ShieldCheck size={22} />} />}{!loaded && <GlassCard className="aspect-video animate-pulse" />}</section>;
}
