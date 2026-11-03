import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as discover } from "@/app/api/public/discover/route";
import { GET as search } from "@/app/api/public/search/route";

const provider = vi.hoisted(() => ({
  configured: true,
  discover: vi.fn(),
  multiSearch: vi.fn(),
}));

vi.mock("@/lib/tmdb", () => ({
  getTmdbClient: () => provider.configured ? { discover: provider.discover, multiSearch: provider.multiSearch } : null,
}));

beforeEach(() => {
  provider.configured = true;
  provider.discover.mockReset();
  provider.multiSearch.mockReset();
  provider.discover.mockResolvedValue({ page: 1, totalPages: 1, totalResults: 0, results: [] });
  provider.multiSearch.mockResolvedValue({ page: 1, totalPages: 1, totalResults: 0, results: [] });
});

describe("public discovery API contracts", () => {
  it("bounds discovery pages and defaults unsupported types to movies", async () => {
    const capped = await discover(new NextRequest("http://localhost/api/public/discover?type=tv&page=9999"));
    expect(capped.status).toBe(200);
    expect(provider.discover).toHaveBeenLastCalledWith("tv", { page: 500 });
    expect(capped.headers.get("cache-control")).toContain("s-maxage=300");

    await discover(new NextRequest("http://localhost/api/public/discover?type=unsupported&page=-4"));
    expect(provider.discover).toHaveBeenLastCalledWith("movie", { page: 1 });
  });

  it("rejects short queries before calling the provider", async () => {
    const response = await search(new NextRequest("http://localhost/api/public/search?q=%20a%20"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("QUERY_TOO_SHORT");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(provider.multiSearch).not.toHaveBeenCalled();
  });

  it("bounds and trims search input and returns only media in the public response", async () => {
    provider.multiSearch.mockResolvedValue({
      page: 1,
      totalPages: 1,
      totalResults: 2,
      results: [
        { kind: "person", person: { id: 11, name: "Person", profilePath: null, knownForDepartment: null } },
        { kind: "media", media: { id: 238, type: "movie", title: "Fixture" } },
      ],
    });
    const longQuery = `  ${"x".repeat(140)}  `;
    const response = await search(new NextRequest(`http://localhost/api/public/search?q=${encodeURIComponent(longQuery)}&page=9999`));

    expect(response.status).toBe(200);
    expect(provider.multiSearch).toHaveBeenCalledWith("x".repeat(100), 100);
    const body = await response.json();
    expect(body.results).toEqual([{ id: 238, type: "movie", title: "Fixture" }]);
    expect(JSON.stringify(body)).not.toContain("Person");
  });
});
