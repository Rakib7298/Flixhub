import { describe, expect, it } from "vitest";
import { TmdbClient } from "../../services/tmdb/src/index";

const explicitlyEnabled = process.env.MEDIAMATRIX_LIVE_TMDB === "1";
const hasCredentials = Boolean(process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY);
const live = describe.runIf(explicitlyEnabled && hasCredentials);

function configuredClient(): TmdbClient {
  return new TmdbClient({
    ...(process.env.TMDB_ACCESS_TOKEN ? { accessToken: process.env.TMDB_ACCESS_TOKEN } : {}),
    ...(process.env.TMDB_API_KEY ? { apiKey: process.env.TMDB_API_KEY } : {}),
    ...(process.env.TMDB_API_BASE_URL ? { baseUrl: process.env.TMDB_API_BASE_URL } : {}),
    maxRetries: 1,
    timeoutMs: 10_000,
  });
}

live("authorized live TMDB acceptance (opt-in)", () => {
  it("reads real genres, discovery, pagination, image paths, and multi-search", async () => {
    const client = configuredClient();
    const genres = await client.genres("movie");
    expect(genres.length).toBeGreaterThan(0);
    expect(genres.every((genre) => Number.isInteger(genre.id) && genre.id > 0 && genre.name.length > 0)).toBe(true);

    const firstPage = await client.discover("movie", { page: 1 });
    const secondPage = await client.discover("movie", { page: 2 });
    expect(firstPage.page).toBe(1);
    expect(secondPage.page).toBe(2);
    expect(firstPage.results.length).toBeGreaterThan(0);
    for (const media of firstPage.results) {
      expect(media.id).toBeGreaterThan(0);
      expect(media.title.length).toBeGreaterThan(0);
      if (media.posterPath) expect(media.posterPath).toMatch(/^\//);
      if (media.backdropPath) expect(media.backdropPath).toMatch(/^\//);
    }

    const search = await client.multiSearch("the", 1);
    expect(search.page).toBe(1);
    expect(search.results.length).toBeGreaterThan(0);
    expect(search.results.every((item) => item.kind === "media" ? item.media.title.length > 0 : item.person.name.length > 0)).toBe(true);
  }, 45_000);

  it("reads a real movie detail/credit contract and person records", async () => {
    const client = configuredClient();
    const discovered = await client.discover("movie", { page: 1 });
    const first = discovered.results[0];
    expect(first).toBeDefined();
    const details = await client.movie(first!.id);
    expect(details.id).toBe(first!.id);
    expect(details.title.length).toBeGreaterThan(0);
    expect(Array.isArray(details.cast)).toBe(true);
    expect(Array.isArray(details.crew)).toBe(true);
    expect(Array.isArray(details.videos)).toBe(true);

    const people = await client.multiSearch("Tom Hanks", 1);
    const result = people.results.find((item) => item.kind === "person");
    expect(result).toBeDefined();
    if (result?.kind === "person") {
      const person = await client.person(result.person.id);
      expect(person.id).toBe(result.person.id);
      expect(person.name.length).toBeGreaterThan(0);
      expect(Array.isArray(person.knownFor)).toBe(true);
    }
  }, 45_000);

  it("reads real TV details and a season/episode contract", async () => {
    const client = configuredClient();
    const discovered = await client.discover("tv", { page: 1 });
    const first = discovered.results[0];
    expect(first).toBeDefined();
    const show = await client.tv(first!.id);
    expect(show.id).toBe(first!.id);
    expect(show.title.length).toBeGreaterThan(0);
    expect(Array.isArray(show.seasons)).toBe(true);

    const selected = show.seasons.find((season) => season.seasonNumber >= 0);
    expect(selected).toBeDefined();
    const season = await client.season(show.id, selected!.seasonNumber);
    expect(season.id).toBe(selected!.id);
    expect(Array.isArray(season.episodes)).toBe(true);
  }, 45_000);
});
