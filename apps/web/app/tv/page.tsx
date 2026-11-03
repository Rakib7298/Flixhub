import type { Metadata } from "next";
import { ErrorState } from "@mediamatrix/ui";
import { getTmdbClient } from "@/lib/tmdb";
import { integer, optionalInteger, safeText, type SearchParams } from "@/lib/query";
import { PageHeader } from "@/components/page-header";
import { MediaGrid } from "@/components/media-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { Pagination } from "@/components/pagination";
import { ConfigurationNotice } from "@/components/configuration-notice";

export const metadata: Metadata = { title: "TV Series", description: "Discover popular and trending television series." };
export const revalidate = 300;

export default async function TvPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const current = { genre: optionalInteger(params.genre, 1), year: optionalInteger(params.year, 1930, 2100), minRating: optionalInteger(params.minRating, 1, 10), sortBy: safeText(params.sort, 40) || "popularity.desc" };
  const page = integer(params.page, 1);
  const client = getTmdbClient();
  if (!client) return <Shell current={current} genres={[]}><ConfigurationNotice /></Shell>;
  const data = await loadCatalog(client, current, page);
  return <Shell current={current} genres={data?.genres ?? []}>{data ? <><p className="mb-5 text-xs text-zinc-500">{data.result.totalResults.toLocaleString()} series from TMDB</p><MediaGrid items={data.result.results} /><Pagination page={data.result.page} totalPages={data.result.totalPages} pathname="/tv" query={{ ...current, sort: current.sortBy }} /></> : <ErrorState description="The TV catalog is temporarily unavailable. Please try again shortly." />}</Shell>;
}

async function loadCatalog(client: NonNullable<ReturnType<typeof getTmdbClient>>, current: { genre?: number; year?: number; minRating?: number; sortBy?: string }, page: number) {
  try {
    const [result, genres] = await Promise.all([client.discover("tv", { page, ...current }), client.genres("tv")]);
    return { result, genres };
  } catch {
    return null;
  }
}

function Shell({ current, genres, children }: { current: { genre?: number; year?: number; minRating?: number; sortBy?: string }; genres: { id: number; name: string }[]; children: React.ReactNode }) {
  return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Stories worth staying for" title="TV Series" description="Find your next obsession, explore seasons, and follow every episode." /><CatalogFilters genres={genres} current={current} />{children}</div>;
}
