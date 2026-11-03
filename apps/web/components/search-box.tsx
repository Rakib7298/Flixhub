"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Film, Loader2, Search, UserRound, X } from "lucide-react";
import type { SearchItem } from "@mediamatrix/tmdb";
import { tmdbImage } from "@/lib/images";

const LISTBOX_ID = "catalog-search-suggestions";

export function SearchBox({ initialQuery = "", large = false }: { initialQuery?: string; large?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      setItems([]);
      setOpen(false);
      setActiveIndex(-1);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json() as { results?: unknown };
        if (!Array.isArray(data.results)) throw new Error("Invalid suggestion response");
        setItems(data.results.filter(isSearchItem).slice(0, 6));
        setOpen(true);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(true);
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    if (value.trim().length < 2) {
      setItems([]);
      setOpen(false);
      setError(false);
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function navigateToSuggestion(index: number) {
    const item = items[index];
    if (!item) return;
    setOpen(false);
    setActiveIndex(-1);
    router.push(suggestionHref(item));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!items.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => current < 0
        ? (direction === 1 ? 0 : items.length - 1)
        : (current + direction + items.length) % items.length);
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      navigateToSuggestion(activeIndex);
    }
  }

  return (
    <div ref={root} className="relative mx-auto w-full max-w-2xl">
      <form onSubmit={submit} role="search" className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={large ? 20 : 17} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (items.length || error) setOpen(true); }}
          className={`field w-full rounded-2xl pl-12 pr-12 shadow-glass ${large ? "h-14 text-base" : "h-12"}`}
          placeholder="Search movies, series, or people…"
          aria-label="Search catalog"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={open && activeIndex >= 0 ? `${LISTBOX_ID}-option-${activeIndex}` : undefined}
          aria-busy={loading}
          autoComplete="off"
        />
        <span className="sr-only" aria-live="polite">{loading ? "Loading search suggestions" : ""}</span>
        {loading ? <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" size={18} aria-hidden="true" /> : query ? <button type="button" onClick={() => updateQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Clear search"><X size={17} /></button> : null}
      </form>
      {open && (
        <div id={LISTBOX_ID} role={items.length ? "listbox" : undefined} aria-label={items.length ? "Search suggestions" : undefined} className="glass-panel absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl p-2">
          {error ? (
            <p role="alert" className="px-4 py-5 text-center text-xs text-zinc-400">Suggestions are unavailable. Press Enter to run your search.</p>
          ) : items.length ? items.map((item, index) => (
            <Link
              key={item.kind === "media" ? `${item.media.type}-${item.media.id}` : `person-${item.person.id}`}
              id={`${LISTBOX_ID}-option-${index}`}
              href={suggestionHref(item)}
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => { setOpen(false); setActiveIndex(-1); }}
              className={`flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[.07] focus-visible:bg-white/[.07] focus-visible:outline-none ${activeIndex === index ? "bg-white/[.07]" : ""}`}
            >
              {item.kind === "media" ? <>
                <SuggestionImage path={item.media.posterPath} />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.media.title}</span><span className="mt-1 block text-[11px] capitalize text-zinc-500">{item.media.type} · {item.media.releaseDate?.slice(0, 4) || "TBA"}</span></span>
              </> : <>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[.06]"><UserRound size={18} /></span>
                <span><span className="block text-sm font-semibold">{item.person.name}</span><span className="text-[11px] text-zinc-500">{item.person.knownForDepartment || "Person"}</span></span>
              </>}
            </Link>
          )) : (
            <p role="status" className="px-4 py-5 text-center text-xs text-zinc-500">No suggestions found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function isSearchItem(value: unknown): value is SearchItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (item.kind === "person") {
    if (!item.person || typeof item.person !== "object") return false;
    const person = item.person as Record<string, unknown>;
    return typeof person.id === "number" && person.id > 0 && typeof person.name === "string" && (person.knownForDepartment === null || person.knownForDepartment === undefined || typeof person.knownForDepartment === "string");
  }
  if (item.kind !== "media" || !item.media || typeof item.media !== "object") return false;
  const media = item.media as Record<string, unknown>;
  return typeof media.id === "number" && media.id > 0 && (media.type === "movie" || media.type === "tv") && typeof media.title === "string" && (media.posterPath === null || typeof media.posterPath === "string") && (media.releaseDate === null || media.releaseDate === undefined || typeof media.releaseDate === "string");
}

function suggestionHref(item: SearchItem): string {
  if (item.kind === "person") return `/person/${item.person.id}`;
  return item.media.type === "movie" ? `/movie/${item.media.id}` : `/tv/${item.media.id}`;
}

function SuggestionImage({ path }: { path: string | null }) {
  const src = tmdbImage(path, "w185");
  return src ? <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-white/5"><Image src={src} alt="" fill sizes="36px" className="object-cover" /></span> : <span className="flex h-12 w-9 items-center justify-center rounded-md bg-white/5 text-zinc-600"><Film size={15} /></span>;
}
