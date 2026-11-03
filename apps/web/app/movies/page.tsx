import type { Metadata } from "next";
import { ErrorState } from "@mediamatrix/ui";
import { getTmdbClient } from "@/lib/tmdb";
import { integer, optionalInteger, safeText, type SearchParams } from "@/lib/query";
import { PageHeader } from "@/components/page-header";
import { MediaGrid } from "@/components/media-grid";
import { CatalogFilters } from "@/components/catalog-filters";
import { Pagination } from "@/components/pagination";
import { ConfigurationNotice } from "@/components/configuration-notice";

export const metadata: Metadata = { title: "Movies", description: "Discover popular, acclaimed, and upcoming movies." };
export const revalidate = 300;

export default async function MoviesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const current = { genre: optionalInteger(params.genre, 1), year: optionalInteger(params.year, 1888, 2100), minRating: optionalInteger(params.minRating, 1, 10), sortBy: safeText(params.sort, 40) || "popularity.desc" };
  const page = integer(params.page, 1);
  const client = getTmdbClient();
  if (!client) return <CatalogShell title="Movies" eyebrow="Explore cinema" description="From new releases to timeless essentials, find something worth your time." current={current} genres={[]}><ConfigurationNotice /></CatalogShell>;
  const data = await loadCatalog(client, current, page);
  return <CatalogShell title="Movies" eyebrow="Explore cinema" description="From new releases to timeless essentials, find something worth your time." current={current} genres={data?.genres ?? []}>{data ? <><p className="mb-5 text-xs text-zinc-500">{data.result.totalResults.toLocaleString()} titles from TMDB</p><MediaGrid items={data.result.results} /><Pagination page={data.result.page} totalPages={data.result.totalPages} pathname="/movies" query={{ ...current, sort: current.sortBy }} /></> : <ErrorState description="The movie catalog is temporarily unavailable. Please try again shortly." />}</CatalogShell>;
}

async function loadCatalog(client: NonNullable<ReturnType<typeof getTmdbClient>>, current: { genre?: number; year?: number; minRating?: number; sortBy?: string }, page: number) {
  try {
    const [result, genres] = await Promise.all([client.discover("movie", { page, ...current }), client.genres("movie")]);
    return { result, genres };
  } catch {
    return null;
  }
}

function CatalogShell({ title, eyebrow, description, current, genres, children }: { title: string; eyebrow: string; description: string; current: { genre?: number; year?: number; minRating?: number; sortBy?: string }; genres: { id: number; name: string }[]; children: React.ReactNode }) {
  return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow={eyebrow} title={title} description={description} /><CatalogFilters genres={genres} current={current} />{children}</div>;
}
