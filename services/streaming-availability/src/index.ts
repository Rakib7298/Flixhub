import type { MediaType, OfferType, StreamingOffer } from "@mediamatrix/shared";

export interface StreamingAvailabilityOptions {
  apiKey: string;
  provider: "movie-of-the-night" | "rapidapi";
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cacheTtlMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export class StreamingAvailabilityError extends Error {
  constructor(message: string, public readonly status = 502, public readonly code = "AVAILABILITY_ERROR") { super(message); this.name = "StreamingAvailabilityError"; }
}

export class StreamingAvailabilityClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<string, { expiresAt: number; value: StreamingOffer[] }>();
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly options: StreamingAvailabilityOptions) {
    if (!options.apiKey) throw new StreamingAvailabilityError("Streaming availability API key is required.", 503, "NOT_CONFIGURED");
    this.baseUrl = (options.baseUrl || (options.provider === "rapidapi" ? "https://streaming-availability.p.rapidapi.com" : "https://api.movieofthenight.com/v4")).replace(/\/$/, "");
    const base = new URL(this.baseUrl);
    if (base.protocol !== "https:" && process.env.NODE_ENV === "production") throw new StreamingAvailabilityError("The availability provider must use HTTPS in production.");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cacheTtlMs = options.cacheTtlMs ?? 6 * 60 * 60_000;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  async getOffers(type: MediaType, tmdbId: number, country = "BD"): Promise<StreamingOffer[]> {
    if (!Number.isInteger(tmdbId) || tmdbId < 1) throw new StreamingAvailabilityError("Invalid TMDB identifier.", 400, "INVALID_PARAMETER");
    const normalizedCountry = country.toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalizedCountry)) throw new StreamingAvailabilityError("Country must be a two-letter ISO code.", 400, "INVALID_COUNTRY");
    const cacheKey = `${type}:${tmdbId}:${normalizedCountry}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const url = new URL(`${this.baseUrl}/shows/${type}/${tmdbId}`);
    url.searchParams.set("country", normalizedCountry.toLowerCase());
    url.searchParams.set("series_granularity", "show");
    const raw = await this.request(url);
    const offers = normalizeStreamingOffers(raw, normalizedCountry);
    this.cache.set(cacheKey, { value: offers, expiresAt: Date.now() + this.cacheTtlMs });
    return offers;
  }

  clearCache() { this.cache.clear(); }

  private async request(url: URL): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers = new Headers({ Accept: "application/json" });
        if (this.options.provider === "rapidapi") {
          headers.set("X-RapidAPI-Key", this.options.apiKey);
          headers.set("X-RapidAPI-Host", new URL(this.baseUrl).host);
        } else headers.set("X-API-Key", this.options.apiKey);
        const response = await this.fetchImpl(url, { headers, signal: controller.signal, cache: "no-store" });
        if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) { await delay(Math.min(200 * 2 ** attempt, 1500)); continue; }
        if (response.status === 404) return { streamingOptions: {} };
        if (!response.ok) throw new StreamingAvailabilityError(response.status === 401 || response.status === 403 ? "The availability provider rejected the configured credentials." : `Availability request failed (${response.status}).`, 502, response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR");
        return await response.json();
      } catch (error) {
        lastError = error;
        if (error instanceof StreamingAvailabilityError) throw error;
        if (attempt >= this.maxRetries) break;
        await delay(200 * 2 ** attempt);
      } finally { clearTimeout(timeout); }
    }
    throw new StreamingAvailabilityError(lastError instanceof Error && lastError.name === "AbortError" ? "Availability lookup timed out." : "Availability is temporarily unavailable.", 503, "UPSTREAM_UNAVAILABLE");
  }
}

export function normalizeStreamingOffers(raw: unknown, country: string): StreamingOffer[] {
  if (!raw || typeof raw !== "object") throw new StreamingAvailabilityError("The provider returned an invalid response.");
  const streamingOptions = (raw as Record<string, unknown>).streamingOptions;
  if (!streamingOptions || typeof streamingOptions !== "object" || Array.isArray(streamingOptions)) return [];
  const entries = Object.entries(streamingOptions as Record<string, unknown>);
  const matching = entries.find(([code]) => code.toUpperCase() === country.toUpperCase())?.[1] ?? [];
  if (!Array.isArray(matching)) return [];
  const verifiedAt = new Date().toISOString();
  const supportedTypes = new Set<OfferType>(["subscription", "free", "rent", "buy"]);
  return matching.flatMap((candidate): StreamingOffer[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const option = candidate as Record<string, any>;
    if (!supportedTypes.has(option.type)) return [];
    const service = option.service;
    if (!service || typeof service !== "object" || !string(service.id) || !string(service.name)) return [];
    const url = officialUrl(option.link);
    const logo = officialUrl(service.imageSet?.darkThemeImage) ?? officialUrl(service.imageSet?.lightThemeImage);
    return [{
      providerId: string(service.id), providerName: string(service.name), providerLogo: logo,
      type: option.type as OfferType, url, quality: nullableString(option.quality), lastVerifiedAt: verifiedAt,
      ...(typeof option.availableSince === "number" ? { availableSince: option.availableSince } : {}),
      ...(typeof option.expiresOn === "number" ? { expiresOn: option.expiresOn } : {}),
      ...(option.price && typeof option.price === "object" ? { price: [option.price.amount, option.price.currency].filter((value) => value !== undefined && value !== null).join(" ") } : {}),
    }];
  });
}

function officialUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : null; } catch { return null; }
}
function string(value: unknown): string { return typeof value === "string" ? value : ""; }
function nullableString(value: unknown): string | null { return typeof value === "string" && value ? value : null; }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
