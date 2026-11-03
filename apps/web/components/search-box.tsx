"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Film, Loader2, Search, UserRound, X } from "lucide-react";
import type { SearchItem } from "@mediamatrix/tmdb";
import { tmdbImage } from "@/lib/images";

export function SearchBox({ initialQuery = "", large = false }: { initialQuery?: string; large?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setItems([]); setOpen(false); setError(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError(false);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json() as { results: SearchItem[] };
        setItems(data.results.slice(0, 6)); setOpen(true);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(true); setOpen(true);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setOpen(false); router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return <div ref={root} className="relative mx-auto w-full max-w-2xl"><form onSubmit={submit} role="search" className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={large ? 20 : 17} /><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => { if (items.length || error) setOpen(true); }} className={`field w-full rounded-2xl pl-12 pr-12 shadow-glass ${large ? "h-14 text-base" : "h-12"}`} placeholder="Search movies, series, or people…" aria-label="Search catalog" autoComplete="off" />{loading ? <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" size={18} /> : query ? <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Clear search"><X size={17} /></button> : null}</form>{open && <div className="glass-panel absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl p-2">{error ? <p className="px-4 py-5 text-center text-xs text-zinc-400">Suggestions are unavailable. Press Enter to run your search.</p> : items.length ? items.map((item) => item.kind === "media" ? <Link key={`${item.media.type}-${item.media.id}`} href={item.media.type === "movie" ? `/movie/${item.media.id}` : `/tv/${item.media.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[.07]"><SuggestionImage path={item.media.posterPath} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.media.title}</span><span className="mt-1 block text-[11px] capitalize text-zinc-500">{item.media.type} · {item.media.releaseDate?.slice(0, 4) || "TBA"}</span></span></Link> : <Link key={`person-${item.person.id}`} href={`/person/${item.person.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[.07]"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[.06]"><UserRound size={18} /></span><span><span className="block text-sm font-semibold">{item.person.name}</span><span className="text-[11px] text-zinc-500">{item.person.knownForDepartment || "Person"}</span></span></Link>) : <p className="px-4 py-5 text-center text-xs text-zinc-500">No suggestions found.</p>}</div>}</div>;
}

function SuggestionImage({ path }: { path: string | null }) {
  const src = tmdbImage(path, "w185");
  return src ? <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-white/5"><Image src={src} alt="" fill sizes="36px" className="object-cover" /></span> : <span className="flex h-12 w-9 items-center justify-center rounded-md bg-white/5 text-zinc-600"><Film size={15} /></span>;
}
