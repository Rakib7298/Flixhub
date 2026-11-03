import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock3, Star } from "lucide-react";
import { TmdbError } from "@mediamatrix/tmdb";
import { formatRuntime, releaseYear } from "@mediamatrix/shared";
import { EmptyState, GlassCard, cn } from "@mediamatrix/ui";
import { getTmdbClient } from "@/lib/tmdb";
import { getAvailability } from "@/lib/availability";
import { integer, safeText, type SearchParams } from "@/lib/query";
import { tmdbImage } from "@/lib/images";
import { DetailsHero } from "@/components/details-hero";
import { AvailabilityPanel } from "@/components/availability-panel";
import { CastSection } from "@/components/cast-section";
import { ProductionDetails } from "@/components/production-details";
import { MediaCarousel } from "@/components/media-carousel";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { AuthorizedSources } from "@/components/authorized-sources";

interface Props { params: Promise<{ id: string }>; searchParams: SearchParams }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { id } = await params; const client = getTmdbClient(); if (!client) return { title: "TV details" }; try { const show = await client.tv(Number(id)); return { title: show.title, description: show.overview.slice(0, 160) }; } catch { return { title: "TV details" }; } }

export default async function TvPage({ params, searchParams }: Props) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId); if (!Number.isInteger(id) || id < 1) notFound();
  const client = getTmdbClient(); if (!client) return <div className="page-container pt-28"><ConfigurationNotice /></div>;
  try {
    const show = await client.tv(id);
    const regularSeasons = show.seasons.filter((season) => season.seasonNumber > 0);
    const requestedSeason = integer(query.season, regularSeasons[0]?.seasonNumber ?? 0, 0, 1000);
    const selectedNumber = show.seasons.some((season) => season.seasonNumber === requestedSeason) ? requestedSeason : regularSeasons[0]?.seasonNumber ?? show.seasons[0]?.seasonNumber ?? 0;
    const requestedCountry = safeText(query.country, 2).toUpperCase();
    const [season, availability] = await Promise.all([show.seasons.length ? client.season(id, selectedNumber) : Promise.resolve(null), getAvailability("tv", id, /^[A-Z]{2}$/.test(requestedCountry) ? requestedCountry : undefined)]);
    return <><DetailsHero media={show} /><div className="page-container pb-16"><ProductionDetails media={show} /><AvailabilityPanel {...availability} /><AuthorizedSources type="tv" tmdbId={show.id} title={show.title} posterPath={show.posterPath} /><CastSection cast={show.cast} /><section className="py-8"><p className="eyebrow">Episode guide</p><div className="mb-5 mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="section-title">Seasons & episodes</h2><div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto">{show.seasons.map((item) => <Link key={item.id} href={`/tv/${id}?season=${item.seasonNumber}#episodes`} className={cn("shrink-0 rounded-full px-3 py-2 text-xs font-semibold", item.seasonNumber === selectedNumber ? "bg-white text-black" : "bg-white/[.06] text-zinc-400")}>{item.name}</Link>)}</div></div><div id="episodes" className="scroll-mt-28">{season?.episodes?.length ? <div className="space-y-3">{season.episodes.map((episode) => { const still = tmdbImage(episode.stillPath, "w780"); return <GlassCard key={episode.id} className="grid overflow-hidden sm:grid-cols-[190px_1fr]"><div className="relative aspect-video bg-white/[.04] sm:aspect-auto sm:min-h-32">{still ? <Image src={still} alt="" fill sizes="190px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-zinc-600">No episode image</div>}</div><div className="p-4 sm:p-5"><div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500"><span className="font-bold uppercase tracking-wider text-red-400">Episode {episode.episodeNumber}</span>{episode.airDate && <span className="flex items-center gap-1"><Calendar size={11} />{releaseYear(episode.airDate)}</span>}{episode.runtime ? <span className="flex items-center gap-1"><Clock3 size={11} />{formatRuntime(episode.runtime)}</span> : null}{episode.rating > 0 && <span className="flex items-center gap-1"><Star size={11} />{episode.rating.toFixed(1)}</span>}</div><h3 className="mt-2 text-sm font-bold">{episode.name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{episode.overview || "No episode description available."}</p></div></GlassCard>; })}</div> : <EmptyState title="Episode details unavailable" description="The metadata provider did not return episodes for this season." />}</div></section><MediaCarousel title="Recommended series" items={show.recommendations} /><MediaCarousel title="More like this" items={show.similar} /></div></>;
  } catch (error) { if (error instanceof TmdbError && error.status === 404) notFound(); throw error; }
}
