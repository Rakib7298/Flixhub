import { describe, expect, it, vi } from "vitest";
import { normalizeStreamingOffers, StreamingAvailabilityClient } from "../../services/streaming-availability/src/index";

const response = { streamingOptions: { bd: [{ type: "subscription", link: "https://provider.example.com/watch/title", quality: "hd", service: { id: "provider", name: "Provider", imageSet: { darkThemeImage: "https://provider.example.com/dark.png" } } }, { type: "subscription", link: "javascript:alert(1)", service: { id: "unsafe", name: "Unsafe" } }] } };

describe("streaming availability", () => {
  it("normalizes official provider options and drops unsupported URLs", () => {
    const offers = normalizeStreamingOffers(response, "BD");
    expect(offers).toHaveLength(2); expect(offers[0]?.url).toBe("https://provider.example.com/watch/title"); expect(offers[1]?.url).toBeNull();
  });
  it("never substitutes another country's availability", () => {
    expect(normalizeStreamingOffers({ streamingOptions: { us: response.streamingOptions.bd } }, "BD")).toEqual([]);
  });
  it("uses the documented v4 endpoint and server-side header", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = new StreamingAvailabilityClient({ apiKey: "test-secret", provider: "movie-of-the-night", fetchImpl: fetchImpl as typeof fetch, maxRetries: 0 });
    const offers = await client.getOffers("movie", 238, "BD");
    expect(offers[0]?.providerName).toBe("Provider");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/v4/shows/movie/238"); expect(url.searchParams.get("country")).toBe("bd");
    expect(new Headers(init.headers).get("X-API-Key")).toBe("test-secret"); expect(url.searchParams.has("api_key")).toBe(false);
  });
});
