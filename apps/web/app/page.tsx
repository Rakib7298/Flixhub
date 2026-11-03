import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { getHomeFeed } from "@/lib/catalog";
import { HomeHero } from "@/components/home-hero";
import { MediaCarousel } from "@/components/media-carousel";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { PersonalizedRows } from "@/components/personalized-rows";

export const revalidate = 300;

export default async function HomePage() {
  const feed = await getHomeFeed();
  return (
    <>
      <HomeHero featured={feed.featured} />
      <div className="page-container relative -mt-10 sm:-mt-16">
        {!feed.configured && <ConfigurationNotice />}
        {feed.failedSections > 0 && <div role="status" className="mb-5 flex items-center gap-3 rounded-xl border border-yellow-500/15 bg-yellow-500/[.05] px-4 py-3 text-xs text-yellow-100"><AlertTriangle size={16} className="shrink-0 text-yellow-400" />{feed.failedSections} catalog section{feed.failedSections === 1 ? " is" : "s are"} temporarily unavailable. Other sections may still be current.</div>}
        <PersonalizedRows />
        {feed.genres.length > 0 && <section className="mb-4 py-5"><div className="mb-4 flex items-center justify-between"><h2 className="section-title">Browse by mood</h2><Link href="/movies" className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-white">All genres <ChevronRight size={14} /></Link></div><div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">{feed.genres.map((genre) => <Link key={genre.id} href={`/movies?genre=${genre.id}`} className="shrink-0 rounded-full border border-white/[.09] bg-white/[.045] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-white">{genre.name}</Link>)}</div></section>}
        <MediaCarousel title="Trending movies" eyebrow="What everyone’s watching" items={feed.trendingMovies} href="/movies?sort=popularity.desc" />
        <MediaCarousel title="Popular series" eyebrow="Stay with the story" items={feed.popularTv} href="/tv" />
        <MediaCarousel title="Fresh in theaters" eyebrow="Recently added" items={feed.recentlyAdded} href="/movies?sort=primary_release_date.desc" />
        <MediaCarousel title="Critically acclaimed" items={feed.topRatedMovies} href="/movies?sort=vote_average.desc" />
        <MediaCarousel title="Trending TV" items={feed.trendingTv} href="/tv?sort=popularity.desc" />
        <MediaCarousel title="Coming soon" items={feed.upcomingMovies} href="/movies?sort=primary_release_date.desc" />
      </div>
    </>
  );
}
