import type { Metadata } from "next";
import { db } from "@mediamatrix/database";
import { decryptSecret, safeSourceLabel } from "@/lib/security";
import { AdminHeader } from "@/components/admin-header";
import { TmdbSyncPanel } from "@/components/tmdb-sync-panel";
import { MediaSourceManager } from "@/components/media-source-manager";

export const metadata: Metadata = { title: "Media management" };
export const dynamic = "force-dynamic";
export default async function AdminMediaPage() {
  const [movies, shows, sources] = await Promise.all([db.movie.findMany({ orderBy: { syncedAt: "desc" }, take: 100 }), db.tvSeries.findMany({ orderBy: { syncedAt: "desc" }, take: 100 }), db.mediaSource.findMany({ where: { deletedAt: null }, include: { movie: true, tvSeries: true, episode: true }, orderBy: { createdAt: "desc" }, take: 300 })]);
  const media = [...movies.map((item) => ({ id: item.id, title: item.title, tmdbId: item.tmdbId, type: "movie" as const })), ...shows.map((item) => ({ id: item.id, title: item.name, tmdbId: item.tmdbId, type: "tv" as const }))];
  return <><AdminHeader eyebrow="Catalog operations" title="Media & sources" description="Synchronize real TMDB metadata and attach only media sources you are authorized to use." /><TmdbSyncPanel /><div className="my-8 border-t border-white/[.07]" /><MediaSourceManager media={media} initialSources={sources.map((source) => ({ id: source.id, label: source.label, sourceLabel: safeSourceLabel(decryptSecret(source.sourceUrlCiphertext)), format: source.format, requiresAuth: source.requiresAuth, isActive: source.isActive, mediaTitle: source.movie?.title ?? source.tvSeries?.name ?? source.episode?.name ?? "Unknown" }))} /></>;
}
