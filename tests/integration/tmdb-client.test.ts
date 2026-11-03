import { describe, expect, it, vi } from "vitest";
import { TmdbClient, TmdbError } from "../../services/tmdb/src/index";

const page = {
  page: 1,
  total_pages: 1,
  total_results: 1,
  results: [{
    id: 238,
    title: "A real fixture",
    original_title: "A real fixture",
    overview: "Test fixture",
    poster_path: "/poster.jpg",
    backdrop_path: null,
    release_date: "2026-01-01",
    vote_average: 8.1,
    vote_count: 100,
    genre_ids: [18],
    popularity: 50,
  }],
};

function clientWith(fetchImpl: ReturnType<typeof vi.fn>, options: { accessToken?: string; apiKey?: string; maxRetries?: number } = {}) {
  return new TmdbClient({
    accessToken: options.accessToken ?? "server-token",
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    fetchImpl: fetchImpl as typeof fetch,
    maxRetries: options.maxRetries ?? 0,
  });
}

function jsonResponse(value: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(value), { status, headers });
}

describe("TMDB client contracts", () => {
  it("requires configured credentials", () => expect(() => new TmdbClient()).toThrow(TmdbError));

  it("sends bearer credentials server-side, maps records, and caches responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(page));
    const client = clientWith(fetchImpl);
    const first = await client.trending("movie");
    const second = await client.trending("movie");

    expect(first.results[0]).toMatchObject({ id: 238, type: "movie", title: "A real fixture", posterPath: "/poster.jpg", genreIds: [18] });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.has("api_key")).toBe(false);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer server-token");
  });

  it("uses an API key only in the server-side provider request", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(page));
    const client = new TmdbClient({ apiKey: "server-api-key", fetchImpl: fetchImpl as typeof fetch, maxRetries: 0 });
    await client.trending("movie");

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("api_key")).toBe("server-api-key");
    expect(new Headers(init.headers).get("Authorization")).toBeNull();
  });

  it("maps multi-search people separately and rejects malformed or unsupported entries", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      page: 1,
      results: [
        { id: 1, media_type: "person", name: "Person" },
        { id: 2, media_type: "person", name: "" },
        { id: 3, media_type: "collection", name: "Not media" },
        { id: 4, media_type: "movie", title: "" },
        { id: true, media_type: "movie", title: "Invalid identifier" },
        { id: 5, media_type: "tv", name: "Valid series", first_air_date: "2025-01-01" },
        null,
        [],
      ],
    }));
    const result = await clientWith(fetchImpl).multiSearch("person");

    expect(result.results).toEqual([
      { kind: "person", person: { id: 1, name: "Person", profilePath: null, knownForDepartment: null } },
      {
        kind: "media",
        media: {
          id: 5,
          type: "tv",
          title: "Valid series",
          originalTitle: "",
          overview: "",
          posterPath: null,
          backdropPath: null,
          releaseDate: "2025-01-01",
          rating: 0,
          voteCount: 0,
          genreIds: [],
          popularity: 0,
        },
      },
    ]);
  });

  it("validates nested genres and bounds untrusted page metadata", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.endsWith("/genre/movie/list")) {
        return jsonResponse({ genres: [{ id: 18, name: "Drama" }, { id: "bad", name: "Invalid" }, { id: 28, name: 7 }, null, []] });
      }
      return jsonResponse({ ...page, page: -4, total_pages: 900, total_results: -3 });
    });
    const client = clientWith(fetchImpl);

    await expect(client.genres("movie")).resolves.toEqual([{ id: 18, name: "Drama" }]);
    const result = await client.trending("movie");
    expect(result).toMatchObject({ page: 1, totalPages: 500, totalResults: 0 });
  });

  it("handles malformed nested detail fields without trusting their types", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      ...page.results[0],
      runtime: "not-a-number",
      credits: "invalid",
      videos: { results: [null, { id: "video", key: "key", site: "YouTube" }] },
      recommendations: null,
      similar: { results: "invalid" },
    }));
    const result = await clientWith(fetchImpl).movie(238);

    expect(result.title).toBe("A real fixture");
    expect(result.runtime).toBeNull();
    expect(result.cast).toEqual([]);
    expect(result.crew).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.similar).toEqual([]);
    expect(result.videos).toHaveLength(1);
  });

  it("maps TV seasons/episodes and person credit contracts", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname.endsWith("/tv/1399")) {
        return jsonResponse({
          id: 1399,
          name: "Fixture series",
          number_of_seasons: 1,
          number_of_episodes: 1,
          episode_run_time: [55, 60],
          seasons: [{ id: 91, name: "Season 1", season_number: 1, episode_count: 1 }],
        });
      }
      if (url.pathname.endsWith("/tv/1399/season/1")) {
        return jsonResponse({
          id: 91,
          name: "Season 1",
          season_number: 1,
          episodes: [{ id: 501, name: "Episode fixture", episode_number: 1, season_number: 1, runtime: 55 }],
        });
      }
      if (url.pathname.endsWith("/person/11")) {
        return jsonResponse({ id: 11, name: "Fixture person", combined_credits: { cast: [{ ...page.results[0], media_type: "movie" }] } });
      }
      throw new Error(`Unexpected fixture endpoint: ${url.pathname}`);
    });
    const client = clientWith(fetchImpl);

    const show = await client.tv(1399);
    expect(show).toMatchObject({ id: 1399, title: "Fixture series", numberOfSeasons: 1, numberOfEpisodes: 1, episodeRunTime: [55, 60] });
    expect(show.seasons[0]).toMatchObject({ id: 91, seasonNumber: 1, episodeCount: 1 });
    const season = await client.season(1399, 1);
    expect(season.episodes?.[0]).toMatchObject({ id: 501, episodeNumber: 1, seasonNumber: 1, runtime: 55 });
    const person = await client.person(11);
    expect(person).toMatchObject({ id: 11, name: "Fixture person" });
    expect(person.knownFor[0]).toMatchObject({ id: 238, type: "movie", title: "A real fixture" });
  });

  it("rejects non-object upstream JSON", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(null));
    const promise = clientWith(fetchImpl).trending("movie");
    await expect(promise).rejects.toMatchObject({ code: "INVALID_UPSTREAM_DATA", status: 502 });
  });

  it("maps provider authentication failures without exposing credentials", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status_message: "secret upstream detail" }, 401));
    const promise = clientWith(fetchImpl).trending("movie");
    await expect(promise).rejects.toMatchObject({ code: "TMDB_AUTH_FAILED", message: "TMDB rejected the configured credentials." });
    await promise.catch((error: unknown) => {
      expect(JSON.stringify(error)).not.toContain("server-token");
      expect(JSON.stringify(error)).not.toContain("secret upstream detail");
    });
  });

  it("retries a retryable upstream failure and then succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status_message: "temporary" }, 500))
      .mockResolvedValueOnce(jsonResponse(page));
    const client = clientWith(fetchImpl, { maxRetries: 1 });

    await expect(client.trending("movie")).resolves.toMatchObject({ page: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("distinguishes an aborted provider request from a generic transport failure", async () => {
    const fetchImpl = vi.fn(async () => { throw new DOMException("aborted", "AbortError"); });
    const promise = clientWith(fetchImpl).trending("movie");
    await expect(promise).rejects.toMatchObject({ code: "TMDB_UNAVAILABLE", message: "TMDB timed out. Please try again." });
  });
});
