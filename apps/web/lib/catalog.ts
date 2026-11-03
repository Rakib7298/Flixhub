import type { Genre, MediaSummary } from "@mediamatrix/shared";
import { getTmdbClient } from "./tmdb";

export interface HomeFeed {
  configured: boolean;
  featured?: MediaSummary;
  trendingMovies: MediaSummary[];
  popularMovies: MediaSummary[];
  upcomingMovies: MediaSummary[];
  topRatedMovies: MediaSummary[];
  popularTv: MediaSummary[];
  trendingTv: MediaSummary[];
  recentlyAdded: MediaSummary[];
  genres: Genre[];
  failedSections: number;
}

export async function getHomeFeed(): Promise<HomeFeed> {
  const empty: HomeFeed = { configured: false, trendingMovies: [], popularMovies: [], upcomingMovies: [], topRatedMovies: [], popularTv: [], trendingTv: [], recentlyAdded: [], genres: [], failedSections: 0 };
  const client = getTmdbClient();
  if (!client) return empty;
  const requests = [
    client.trending("movie", "week"),
    client.popular("movie"),
    client.upcomingMovies(),
    client.topRatedMovies(),
    client.popular("tv"),
    client.trending("tv", "week"),
    client.nowPlayingMovies(),
    client.genres("movie"),
  ] as const;
  const results = await Promise.allSettled(requests);
  const failedSections = results.filter((result) => result.status === "rejected").length;
  const page = (index: number) => results[index]?.status === "fulfilled" ? (results[index].value as { results: MediaSummary[] }).results : [];
  const genres = results[7]?.status === "fulfilled" ? results[7].value as Genre[] : [];
  const trendingMovies = page(0);
  return {
    configured: true,
    featured: trendingMovies.find((item) => item.backdropPath) ?? trendingMovies[0],
    trendingMovies,
    popularMovies: page(1), upcomingMovies: page(2), topRatedMovies: page(3),
    popularTv: page(4), trendingTv: page(5), recentlyAdded: page(6), genres,
    failedSections,
  };
}
