/* eslint-disable @next/next/no-img-element -- User-configured channel artwork bypasses the Next.js image optimizer. */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Heart, ListVideo, Plus, Radio, Search, Settings2, Star } from "lucide-react";
import { apiRequest } from "@mediamatrix/api-client";
import { Button, EmptyState, GlassCard, Skeleton, cn } from "@mediamatrix/ui";
import { VideoPlayer, PlayerStatus } from "./video-player";

interface Playlist { id: string; name: string; itemCount: number; isOwner?: boolean; lastSyncAt?: string | null; status?: string }
interface Channel { id: string; channelKey: string; name: string; url: string; logo: string | null; group: string; tvgId: string | null }
interface ChannelResponse { items: Channel[]; groups: string[]; page: number; totalPages: number; total: number }

export function LiveTvDashboard() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistId, setPlaylistId] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [channelLoading, setChannelLoading] = useState(false);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "loading") return;
    setLoading(true); setError("");
    apiRequest<{ items: Playlist[] }>(session?.user ? "/api/playlists" : "/api/playlists/public").then((data) => {
      setPlaylists(data.items); setPlaylistId((current) => data.items.some((item) => item.id === current) ? current : data.items[0]?.id ?? "");
      if (session?.user) void apiRequest<{ items: Array<{ mediaKey: string }> }>("/api/user/channel-favorites").then((result) => setFavorites(new Set(result.items.map((item) => item.mediaKey)))).catch(() => undefined);
    }).catch((caught) => { setError(caught instanceof Error ? caught.message : "Playlists are unavailable"); setPlaylists([]); }).finally(() => setLoading(false));
  }, [session?.user, status]);

  const loadChannels = useCallback(async (targetPage = 1, append = false) => {
    if (!playlistId) { setChannels([]); setSelected(null); return; }
    setChannelLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(targetPage) }); if (submittedQuery) params.set("q", submittedQuery); if (group) params.set("group", group);
      const data = await apiRequest<ChannelResponse>(`/api/playlists/${playlistId}/items?${params}`);
      setChannels((current) => append ? [...current, ...data.items] : data.items); setGroups(data.groups); setPage(data.page); setTotalPages(data.totalPages);
      setSelected((current) => append ? current : data.items.find((item) => item.id === current?.id) ?? data.items[0] ?? null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Channels could not be loaded"); if (!append) setChannels([]); }
    finally { setChannelLoading(false); }
  }, [playlistId, submittedQuery, group]);

  useEffect(() => { void loadChannels(); }, [loadChannels]);

  function search(event: FormEvent) { event.preventDefault(); setSubmittedQuery(query.trim()); }
  async function toggleFavorite(channel: Channel) {
    if (!session?.user) return;
    const saved = favorites.has(`channel:${channel.channelKey}`);
    try {
      await apiRequest("/api/user/channel-favorites", { method: "POST", body: JSON.stringify({ playlistItemId: channel.id, action: saved ? "remove" : "add" }) });
      setFavorites((current) => { const next = new Set(current); if (saved) next.delete(`channel:${channel.channelKey}`); else next.add(`channel:${channel.channelKey}`); return next; });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Favorite could not be updated"); }
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
    <div>
      {selected ? <><VideoPlayer key={selected.id} source={selected.url} title={selected.name} mediaKey={`channel:${selected.channelKey}`} posterPath={null} /><GlassCard className="mt-4 flex items-center gap-4 p-4"><ChannelLogo channel={selected} large /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><PlayerStatus live /><span className="text-[10px] text-zinc-600">{selected.group}</span></div><h2 className="mt-1 truncate text-lg font-bold">{selected.name}</h2></div>{session?.user && <button onClick={() => toggleFavorite(selected)} className={cn("flex h-11 w-11 items-center justify-center rounded-full border border-white/10", favorites.has(`channel:${selected.channelKey}`) ? "bg-red-500/15 text-red-400" : "text-zinc-400 hover:bg-white/10")} aria-label={favorites.has(`channel:${selected.channelKey}`) ? "Remove favorite channel" : "Favorite channel"}><Heart size={18} className={favorites.has(`channel:${selected.channelKey}`) ? "fill-current" : ""} /></button>}</GlassCard></> : <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[.025] p-8 text-center"><div><Radio className="mx-auto mb-4 text-zinc-600" size={34} /><p className="text-sm text-zinc-500">Select an authorized channel to start playback.</p></div></div>}
      <GlassCard className="mt-5 p-5"><div className="flex items-start gap-3"><ListVideo className="mt-0.5 shrink-0 text-red-400" size={18} /><div><h2 className="text-sm font-semibold">Authorized viewing only</h2><p className="mt-1 text-xs leading-5 text-zinc-500">A playlist’s presence here does not grant redistribution rights. Stream compatibility depends on the provider, browser, codec, CORS policy, and network. MediaMatrix does not bypass DRM or access controls.</p></div></div></GlassCard>
    </div>
    <aside className="min-w-0">
      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/[.07] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold"><Radio size={16} className="text-red-400" />Channel guide</h2>{session?.user && <Link href="/live-tv/manage" className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white"><Settings2 size={13} />Manage</Link>}</div>{playlists.length > 0 && <select className="field" value={playlistId} onChange={(event) => { setPlaylistId(event.target.value); setGroup(""); setSubmittedQuery(""); setQuery(""); }} aria-label="Select playlist">{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name} · {playlist.itemCount} channels</option>)}</select>}<form onSubmit={search} className="relative mt-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} /><input className="field pl-9 pr-16" placeholder="Search channels" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10">FIND</button></form>{groups.length > 0 && <select className="field mt-3" value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Filter channel category"><option value="">All categories</option>{groups.map((item) => <option key={item} value={item}>{item}</option>)}</select>}</div>
        {error && <p role="alert" className="m-3 rounded-xl border border-red-500/15 bg-red-500/[.06] p-3 text-xs leading-5 text-red-200">{error}</p>}
        {loading ? <div className="space-y-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : !playlists.length ? <div className="p-4"><EmptyState title="No authorized playlists" description={session?.user ? "Add an M3U/M3U8 URL or upload a playlist you are authorized to use." : "No public playlists are available. Sign in to add and manage your own authorized sources."} action={session?.user ? <Link href="/live-tv/manage"><Button size="sm"><Plus size={14} />Add playlist</Button></Link> : <Link href="/login?callbackUrl=/live-tv"><Button size="sm">Sign in</Button></Link>} /></div> : <div className="max-h-[620px] overflow-y-auto p-2">{channels.map((channel) => <div key={channel.id} className={cn("group flex items-center gap-2 rounded-xl p-2 transition", selected?.id === channel.id ? "bg-red-500/10" : "hover:bg-white/[.05]")}><button onClick={() => setSelected(channel)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><ChannelLogo channel={channel} /><span className="min-w-0"><span className="block truncate text-xs font-semibold text-zinc-200">{channel.name}</span><span className="mt-1 block truncate text-[10px] text-zinc-500">{channel.group}</span></span></button>{session?.user && <button onClick={() => toggleFavorite(channel)} className={cn("rounded-full p-2", favorites.has(`channel:${channel.channelKey}`) ? "text-red-400" : "text-zinc-600 opacity-0 group-hover:opacity-100 focus:opacity-100")} aria-label="Toggle favorite"><Star size={14} className={favorites.has(`channel:${channel.channelKey}`) ? "fill-current" : ""} /></button>}</div>)}{channelLoading && <p className="p-4 text-center text-xs text-zinc-500">Loading channels…</p>}{!channelLoading && !channels.length && <p className="p-6 text-center text-xs text-zinc-500">No channels match this view.</p>}{page < totalPages && <Button variant="ghost" size="sm" className="mt-2 w-full" loading={channelLoading} onClick={() => loadChannels(page + 1, true)}>Load more</Button>}</div>}
      </GlassCard>
    </aside>
  </div>;
}

function ChannelLogo({ channel, large = false }: { channel: Channel; large?: boolean }) { return <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[.08] bg-white/[.05] p-1.5 text-zinc-500", large ? "h-14 w-14" : "h-10 w-10")}>{channel.logo ? <img src={channel.logo} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" /> : <Radio size={large ? 22 : 16} />}</span>; }
