import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@mediamatrix/database";
import { requireUser } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { WatchlistGrid } from "@/components/watchlist-grid";

export const metadata: Metadata = { title: "Favorites" };
export const dynamic = "force-dynamic";
export default async function FavoritesPage() {
  const user = await requireUser().catch((error) => { if (error && typeof error === "object" && "status" in error && error.status === 401) return null; throw error; });
  if (!user) redirect("/login?callbackUrl=/favorites");
  const items = await db.favorite.findMany({ where: { userId: user.id, tmdbId: { not: null }, mediaType: { not: null } }, orderBy: { createdAt: "desc" } });
  const valid = items.filter((item) => item.tmdbId && item.mediaType);
  return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Your closest stories" title="Favorites" description={`${valid.length} favorite title${valid.length === 1 ? "" : "s"}. Removing an item from this view updates your favorites.`} /><WatchlistGrid mode="favorites" initialItems={valid.map((item) => ({ mediaKey: item.mediaKey, mediaType: item.mediaType!, tmdbId: item.tmdbId!, title: item.title, posterPath: item.posterPath }))} /></div>;
}
