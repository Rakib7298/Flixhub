import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TmdbError } from "@mediamatrix/tmdb";
import { getTmdbClient } from "@/lib/tmdb";
import { getAvailability } from "@/lib/availability";
import { safeText, type SearchParams } from "@/lib/query";
import { DetailsHero } from "@/components/details-hero";
import { AvailabilityPanel } from "@/components/availability-panel";
import { CastSection } from "@/components/cast-section";
import { ProductionDetails } from "@/components/production-details";
import { MediaCarousel } from "@/components/media-carousel";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { AuthorizedSources } from "@/components/authorized-sources";

interface Props { params: Promise<{ id: string }>; searchParams: SearchParams }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params; const client = getTmdbClient(); if (!client) return { title: "Movie details" };
  try { const movie = await client.movie(Number(id)); return { title: movie.title, description: movie.overview.slice(0, 160) }; } catch { return { title: "Movie details" }; }
}

export default async function MoviePage({ params, searchParams }: Props) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId); if (!Number.isInteger(id) || id < 1) notFound();
  const client = getTmdbClient();
  if (!client) return <div className="page-container pt-28"><ConfigurationNotice /></div>;
  const requestedCountry = safeText(query.country, 2).toUpperCase();
  const { movie, availability } = await loadMovie(client, id, /^[A-Z]{2}$/.test(requestedCountry) ? requestedCountry : undefined);
  return <><DetailsHero media={movie} /><div className="page-container pb-16"><ProductionDetails media={movie} /><AvailabilityPanel {...availability} /><AuthorizedSources type="movie" tmdbId={movie.id} title={movie.title} posterPath={movie.posterPath} /><CastSection cast={movie.cast} /><MediaCarousel title="Recommended for you" items={movie.recommendations} /><MediaCarousel title="More like this" items={movie.similar} /></div></>;
}

async function loadMovie(client: NonNullable<ReturnType<typeof getTmdbClient>>, id: number, country?: string) {
  try {
    const [movie, availability] = await Promise.all([client.movie(id), getAvailability("movie", id, country)]);
    return { movie, availability };
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }
}
