import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@mediamatrix/database";
import { requireUser } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { WatchlistGrid } from "@/components/watchlist-grid";

export const metadata: Metadata = { title: "My watchlist" };
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await requireUser().catch((error) => { if (error && typeof error === "object" && "status" in error && error.status === 401) return null; throw error; });
  if (!user) redirect("/login?callbackUrl=/watchlist");
  const items = await db.watchlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
  return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Saved for later" title="My watchlist" description={`${items.length} saved title${items.length === 1 ? "" : "s"}. Your list is private to your account.`} /><WatchlistGrid initialItems={items.map((item) => ({ mediaKey: item.mediaKey, mediaType: item.mediaType, tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath }))} /></div>;
}
