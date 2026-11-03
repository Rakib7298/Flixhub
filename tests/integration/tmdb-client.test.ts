import { describe, expect, it, vi } from "vitest";
import { TmdbClient, TmdbError } from "../../services/tmdb/src/index";

const page = { page: 1, total_pages: 1, total_results: 1, results: [{ id: 238, title: "A real fixture", original_title: "A real fixture", overview: "Test fixture", poster_path: "/poster.jpg", backdrop_path: null, release_date: "2026-01-01", vote_average: 8.1, vote_count: 100, genre_ids: [18], popularity: 50 }] };

describe("TMDB client contracts", () => {
  it("requires configured credentials", () => expect(() => new TmdbClient()).toThrow(TmdbError));
  it("sends bearer credentials server-side, maps records, and caches responses", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(page), { status: 200 }));
    const client = new TmdbClient({ accessToken: "server-token", fetchImpl: fetchImpl as typeof fetch, maxRetries: 0 });
    const first = await client.trending("movie"); const second = await client.trending("movie");
    expect(first.results[0]).toMatchObject({ id: 238, type: "movie", title: "A real fixture", posterPath: "/poster.jpg" }); expect(second).toEqual(first); expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]; expect(url.searchParams.has("api_key")).toBe(false); expect(new Headers(init.headers).get("Authorization")).toBe("Bearer server-token");
  });
  it("maps multi-search people separately from media", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ results: [{ id: 1, media_type: "person", name: "Person" }] }), { status: 200 }));
    const client = new TmdbClient({ apiKey: "key", fetchImpl: fetchImpl as typeof fetch, maxRetries: 0 }); const result = await client.multiSearch("person");
    expect(result.results[0]).toEqual({ kind: "person", person: { id: 1, name: "Person", profilePath: null, knownForDepartment: null } });
  });
});
