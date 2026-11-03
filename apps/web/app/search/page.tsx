import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, UserRound } from "lucide-react";
import { EmptyState, ErrorState } from "@mediamatrix/ui";
import type { MediaSummary, Page } from "@mediamatrix/shared";
import type { SearchItem } from "@mediamatrix/tmdb";
import { getTmdbClient } from "@/lib/tmdb";
import { integer, optionalInteger, safeText, single, type SearchParams } from "@/lib/query";
import { SearchBox } from "@/components/search-box";
import { MediaGrid } from "@/components/media-grid";
import { Pagination } from "@/components/pagination";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { CatalogFilters } from "@/components/catalog-filters";

export const metadata: Metadata = { title: "Search", description: "Search movies, TV series, and people." };
export const revalidate = 120;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = safeText(params.q);
  const type = ["movie", "tv", "all"].includes(single(params.type)) ? single(params.type) : "all";
  const page = integer(params.page, 1);
  const current = { genre: optionalInteger(params.genre, 1), year: optionalInteger(params.year, 1888, 2100), minRating: optionalInteger(params.minRating, 1, 10), q: query };
  const client = getTmdbClient();
  return <div className="page-container pb-16 pt-28 sm:pt-32"><div className="mb-10 text-center"><p className="eyebrow">Find your next story</p><h1 className="mb-6 mt-2 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">Search the matrix</h1><SearchBox initialQuery={query} large /></div>{!client ? <ConfigurationNotice /> : <SearchResults query={query} type={type} page={page} current={current} />}</div>;
}

async function SearchResults({ query, type, page, current }: { query: string; type: string; page: number; current: { genre?: number; year?: number; minRating?: number; q?: string } }) {
  if (!query && !current.genre && !current.year && !current.minRating) return <EmptyState title="What are you in the mood for?" description="Search by title, actor, or director. You can also use genre, year, rating, and type filters to explore the catalog." icon={<SearchIcon size={22} />} />;
  const client = getTmdbClient()!;
  try {
    const [result, movieGenres, tvGenres] = await Promise.all([loadResults(client, query, type, page, current), client.genres("movie"), client.genres("tv")]);
    const genres = [...new Map([...movieGenres, ...tvGenres].map((genre) => [genre.id, genre])).values()];
    const media = result.results.flatMap((item) => item.kind === "media" ? [item.media] : []);
    const people = result.results.flatMap((item) => item.kind === "person" ? [item.person] : []);
    return <><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex rounded-full border border-white/10 bg-white/[.04] p-1">{["all", "movie", "tv"].map((value) => <Link key={value} href={searchHref(query, value, current)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${type === value ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>{value === "all" ? "All results" : value === "movie" ? "Movies" : "TV"}</Link>)}</div><p className="text-xs text-zinc-500">{result.totalResults.toLocaleString()} results</p></div><CatalogFilters genres={genres} current={current} />{people.length > 0 && <section className="mb-8"><h2 className="section-title mb-4">People</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{people.map((person) => <Link key={person.id} href={`/person/${person.id}`} className="rounded-2xl border border-white/[.07] bg-white/[.035] p-5 text-center transition hover:bg-white/[.07]"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[.06] text-zinc-400"><UserRound /></span><span className="mt-3 block truncate text-sm font-semibold">{person.name}</span><span className="mt-1 block text-[11px] text-zinc-500">{person.knownForDepartment || "Person"}</span></Link>)}</div></section>}<MediaGrid items={media} emptyTitle="No matching titles" emptyDescription="Try fewer filters, a different title spelling, or another content type." /><Pagination page={result.page} totalPages={result.totalPages} pathname="/search" query={{ q: query, type, ...current }} /></>;
  } catch {
    return <ErrorState description="Search is temporarily unavailable. Check the catalog connection and try again." />;
  }
}

async function loadResults(client: NonNullable<ReturnType<typeof getTmdbClient>>, query: string, type: string, page: number, filters: { genre?: number; year?: number; minRating?: number }): Promise<Page<SearchItem>> {
  if (type === "movie" || type === "tv") {
    const result = query ? await client.search(type, query, { page, ...filters }) : await client.discover(type, { page, ...filters });
    return { ...result, results: result.results.map((media) => ({ kind: "media", media })) };
  }
  if (query) {
    const result = await client.multiSearch(query, page);
    return { ...result, results: result.results.filter((item) => item.kind === "person" || ((!filters.genre || item.media.genreIds.includes(filters.genre)) && (!filters.minRating || item.media.rating >= filters.minRating) && (!filters.year || item.media.releaseDate?.startsWith(String(filters.year))))) };
  }
  const [movies, tv] = await Promise.all([client.discover("movie", { page, ...filters }), client.discover("tv", { page, ...filters })]);
  const results: SearchItem[] = [...movies.results, ...tv.results].sort((a: MediaSummary, b: MediaSummary) => b.popularity - a.popularity).map((media) => ({ kind: "media", media }));
  return { page, totalPages: Math.max(movies.totalPages, tv.totalPages), totalResults: movies.totalResults + tv.totalResults, results };
}

function searchHref(query: string, type: string, current: { genre?: number; year?: number; minRating?: number }) {
  const params = new URLSearchParams(); if (query) params.set("q", query); params.set("type", type);
  Object.entries(current).forEach(([key, value]) => { if (value !== undefined && key !== "q") params.set(key, String(value)); });
  return `/search?${params}`;
}
