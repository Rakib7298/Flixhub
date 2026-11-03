"use client";

import { useRouter, usePathname } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import type { Genre } from "@mediamatrix/shared";

export function CatalogFilters({ genres, current }: { genres: { id: number; name: string }[]; current: { genre?: number; year?: number; minRating?: number; sortBy?: string; q?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (current.q) params.set("q", current.q);
    for (const [name, currentValue] of Object.entries({ genre: current.genre, year: current.year, minRating: current.minRating, sort: current.sortBy })) {
      if (currentValue !== undefined && name !== key) params.set(name, String(currentValue));
    }
    if (value) params.set(key, value);
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  }
  return <div className="mb-8 rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-zinc-500"><Filter size={13} />Refine results</div><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><label><span className="sr-only">Genre</span><select aria-label="Genre" className="field" value={current.genre ?? ""} onChange={(event) => update("genre", event.target.value)}><option value="">All genres</option>{genres.map((genre: Genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select></label><label><span className="sr-only">Release year</span><select aria-label="Release year" className="field" value={current.year ?? ""} onChange={(event) => update("year", event.target.value)}><option value="">Any year</option>{Array.from({ length: 80 }, (_, index) => new Date().getFullYear() + 1 - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span className="sr-only">Minimum rating</span><select aria-label="Minimum rating" className="field" value={current.minRating ?? ""} onChange={(event) => update("minRating", event.target.value)}><option value="">Any rating</option>{[7, 8, 9].map((rating) => <option key={rating} value={rating}>{rating}+ rating</option>)}</select></label><label><span className="sr-only">Sort by</span><select aria-label="Sort by" className="field" value={current.sortBy ?? "popularity.desc"} onChange={(event) => update("sort", event.target.value)}><option value="popularity.desc">Most popular</option><option value="vote_average.desc">Highest rated</option><option value="primary_release_date.desc">Newest</option><option value="revenue.desc">Box office</option></select></label></div>{(current.genre || current.year || current.minRating || current.q) && <button onClick={() => router.push(pathname)} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"><RotateCcw size={12} />Clear filters</button>}</div>;
}
