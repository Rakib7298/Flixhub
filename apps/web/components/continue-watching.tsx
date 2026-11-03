"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Play } from "lucide-react";
import { tmdbImage } from "@/lib/images";

interface ProgressItem { id: string; mediaKey: string; title: string; posterPath: string | null; seconds: number; duration: number }

export function ContinueWatching() {
  const [items, setItems] = useState<ProgressItem[]>([]);
  useEffect(() => { apiProgress().then(setItems).catch(() => setItems([])); }, []);
  if (!items.length) return null;
  return <section className="mb-6 py-5"><div className="mb-4 flex items-center gap-2"><History size={18} className="text-red-400" /><h2 className="section-title">Continue watching</h2></div><div className="media-scroller no-scrollbar flex gap-4 overflow-x-auto pb-3">{items.map((item) => { const image = tmdbImage(item.posterPath, "w342"); const target = item.mediaKey.startsWith("movie:") ? `/movie/${item.mediaKey.split(":")[1]}` : item.mediaKey.startsWith("tv:") ? `/tv/${item.mediaKey.split(":")[1]}` : item.mediaKey.startsWith("jellyfin:") ? "/admin/media-server" : "/live-tv"; return <Link href={target} key={item.id} className="group relative aspect-video w-[270px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-matrix-card sm:w-[320px]">{image ? <Image src={image} alt="" fill sizes="320px" className="object-cover opacity-60 transition group-hover:scale-105" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" /><div className="absolute inset-0 flex items-center justify-center"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition group-hover:bg-matrix-red"><Play size={18} className="ml-0.5 fill-current" /></span></div><div className="absolute inset-x-4 bottom-4"><h3 className="truncate text-sm font-semibold">{item.title}</h3><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-matrix-red" style={{ width: `${Math.min(100, item.seconds / item.duration * 100)}%` }} /></div><p className="mt-2 text-[10px] text-zinc-400">{Math.round(item.seconds / item.duration * 100)}% watched</p></div></Link>; })}</div></section>;
}

async function apiProgress(): Promise<ProgressItem[]> { const response = await fetch("/api/user/progress", { cache: "no-store" }); if (!response.ok) throw new Error("Unavailable"); return (await response.json() as { items: ProgressItem[] }).items; }
