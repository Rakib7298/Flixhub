"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@mediamatrix/api-client";
import { EmptyState, GlassCard } from "@mediamatrix/ui";
import { HardDrive, Play, Server } from "lucide-react";
import { VideoPlayer } from "./video-player";

interface Library { id: string; name: string; collectionType: string | null }
interface Item { id: string; name: string; type: string; overview: string; year: number | null; container: string | null; communityRating: number | null }

export function JellyfinPanel() {
  const [libraries, setLibraries] = useState<Library[]>([]); const [items, setItems] = useState<Item[]>([]); const [parentId, setParentId] = useState(""); const [selected, setSelected] = useState<Item | null>(null); const [configured, setConfigured] = useState(true); const [error, setError] = useState("");
  useEffect(() => { apiRequest<{ items: Library[] }>("/api/media-server/jellyfin/libraries").then((data) => setLibraries(data.items)).catch((caught) => { if (caught && typeof caught === "object" && "status" in caught && caught.status === 503) setConfigured(false); else setError(caught instanceof Error ? caught.message : "Jellyfin unavailable"); }); }, []);
  useEffect(() => { if (!configured) return; apiRequest<{ items: Item[] }>(`/api/media-server/jellyfin/items${parentId ? `?parentId=${parentId}` : ""}`).then((data) => { setItems(data.items); setSelected(null); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load media")); }, [parentId, configured]);
  if (!configured) return <EmptyState title="Jellyfin is optional and not configured" description="Set JELLYFIN_SERVER_URL, JELLYFIN_API_KEY, and JELLYFIN_USER_ID on the server. Local server addresses also require an explicit private-network opt-in." icon={<Server size={22} />} />;
  return <div className="space-y-5">{selected && <VideoPlayer source={`/api/media-server/jellyfin/stream/${selected.id}`} title={selected.name} mediaKey={`jellyfin:${selected.id}`} direct />}{error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<GlassCard className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-bold"><HardDrive size={18} className="text-red-400" />Your Jellyfin library</h2><p className="mt-1 text-xs text-zinc-500">Administrator-only access · Credentials never sent to the browser</p></div>{libraries.length > 0 && <select className="field w-auto" value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">All libraries</option>{libraries.map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}</select>}</div>{items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <button key={item.id} onClick={() => setSelected(item)} className="rounded-xl border border-white/[.07] bg-white/[.035] p-4 text-left transition hover:bg-white/[.07]"><Play size={16} className="mb-3 text-red-400" /><h3 className="truncate text-sm font-semibold">{item.name}</h3><p className="mt-1 text-[11px] text-zinc-500">{item.year || "Year unknown"} · {item.container?.toUpperCase() || "Container unknown"}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{item.overview || "No overview available."}</p></button>)}</div> : <EmptyState title="No media returned" description="The configured Jellyfin user has no Movie or Series items in this view, or the library is empty." />}</GlassCard></div>;
}
