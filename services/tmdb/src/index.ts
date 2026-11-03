import type { Genre, MediaSummary, MediaType, MovieDetails, Page, PersonCredit, PersonDetails, Season, TvDetails } from "@mediamatrix/shared";

export interface TmdbClientOptions {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cacheTtlMs?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export class TmdbError extends Error {
  constructor(message: string, public readonly status = 0, public readonly code = "TMDB_ERROR") {
    super(message);
    this.name = "TmdbError";
  }
}

interface CacheEntry { value: unknown; expiresAt: number }
interface TmdbPage<T = Record<string, unknown>> { page?: number; total_pages?: number; total_results?: number; results?: T[] }

export type SearchItem =
  | { kind: "media"; media: MediaSummary }
  | { kind: "person"; person: { id: number; name: string; profilePath: string | null; knownForDepartment: string | null } };

export interface CatalogFilters {
  page?: number;
  genre?: number;
  year?: number;
  minRating?: number;
  sortBy?: string;
}

export class TmdbClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private activeRequests = 0;
  private waiting: Array<() => void> = [];

  constructor(private readonly options: TmdbClientOptions = {}) {
    if (!options.accessToken && !options.apiKey) throw new TmdbError("TMDB credentials are not configured.", 503, "TMDB_NOT_CONFIGURED");
    this.baseUrl = (options.baseUrl || "https://api.themoviedb.org/3").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cacheTtlMs = options.cacheTtlMs ?? 300_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async trending(type: MediaType, window: "day" | "week" = "week", page = 1) {
    return this.mediaPage(`/trending/${type}/${window}`, { page }, type);
  }

  async popular(type: MediaType, page = 1) {
    return this.mediaPage(type === "movie" ? "/movie/popular" : "/tv/popular", { page }, type);
  }

  async topRatedMovies(page = 1) { return this.mediaPage("/movie/top_rated", { page }, "movie"); }
  async upcomingMovies(page = 1) { return this.mediaPage("/movie/upcoming", { page }, "movie"); }
  async nowPlayingMovies(page = 1) { return this.mediaPage("/movie/now_playing", { page }, "movie"); }
  async onTheAirTv(page = 1) { return this.mediaPage("/tv/on_the_air", { page }, "tv"); }

  async discover(type: MediaType, filters: CatalogFilters = {}) {
    const allowedSorts = new Set(["popularity.desc", "vote_average.desc", "primary_release_date.desc", "first_air_date.desc", "revenue.desc"]);
    return this.mediaPage(`/discover/${type}`, {
      page: filters.page ?? 1,
      with_genres: filters.genre,
      primary_release_year: type === "movie" ? filters.year : undefined,
      first_air_date_year: type === "tv" ? filters.year : undefined,
      "vote_average.gte": filters.minRating,
      "vote_count.gte": filters.minRating ? 50 : undefined,
      sort_by: allowedSorts.has(filters.sortBy ?? "") ? filters.sortBy : "popularity.desc",
      include_adult: false,
    }, type);
  }

  async search(type: MediaType, query: string, filters: CatalogFilters = {}): Promise<Page<MediaSummary>> {
    const result = await this.mediaPage(`/search/${type}`, {
      query,
      page: filters.page ?? 1,
      include_adult: false,
      year: type === "movie" ? filters.year : undefined,
      first_air_date_year: type === "tv" ? filters.year : undefined,
    }, type, 120_000);
    if (!filters.genre && !filters.minRating) return result;
    return {
      ...result,
      results: result.results.filter((item) => (!filters.genre || item.genreIds.includes(filters.genre!)) && (!filters.minRating || item.rating >= filters.minRating)),
    };
  }

  async multiSearch(query: string, page = 1): Promise<Page<SearchItem>> {
    const data = await this.request<TmdbPage>("/search/multi", { query, page, include_adult: false }, 120_000);
    const results = (data.results ?? []).flatMap((raw): SearchItem[] => {
      if (raw.media_type === "person") {
        return [{ kind: "person", person: { id: number(raw.id), name: string(raw.name), profilePath: nullableString(raw.profile_path), knownForDepartment: nullableString(raw.known_for_department) } }];
      }
      const media = normalizeMedia(raw, raw.media_type === "tv" ? "tv" : "movie");
      return media ? [{ kind: "media", media }] : [];
    });
    return normalizePage(data, results);
  }

  async movie(id: number): Promise<MovieDetails> {
    positiveId(id);
    const raw = await this.request<Record<string, any>>(`/movie/${id}`, { append_to_response: "credits,videos,recommendations,similar" }, 600_000);
    const base = normalizeMedia(raw, "movie");
    if (!base) throw new TmdbError("TMDB returned an invalid movie record.", 502, "INVALID_UPSTREAM_DATA");
    return {
      ...base,
      type: "movie",
      runtime: nullableNumber(raw.runtime),
      genres: normalizeGenres(raw.genres),
      tagline: string(raw.tagline),
      status: string(raw.status),
      productionCompanies: array(raw.production_companies).map((company) => string(company.name)).filter(Boolean),
      cast: normalizeCredits(raw.credits?.cast, "cast"),
      crew: normalizeCredits(raw.credits?.crew, "crew"),
      videos: normalizeVideos(raw.videos?.results),
      recommendations: normalizeMediaList(raw.recommendations?.results, "movie"),
      similar: normalizeMediaList(raw.similar?.results, "movie"),
    };
  }

  async tv(id: number): Promise<TvDetails> {
    positiveId(id);
    const raw = await this.request<Record<string, any>>(`/tv/${id}`, { append_to_response: "credits,videos,recommendations,similar" }, 600_000);
    const base = normalizeMedia(raw, "tv");
    if (!base) throw new TmdbError("TMDB returned an invalid TV record.", 502, "INVALID_UPSTREAM_DATA");
    return {
      ...base,
      type: "tv",
      genres: normalizeGenres(raw.genres),
      tagline: string(raw.tagline),
      status: string(raw.status),
      numberOfSeasons: number(raw.number_of_seasons),
      numberOfEpisodes: number(raw.number_of_episodes),
      episodeRunTime: array(raw.episode_run_time).map((value) => number(value)),
      cast: normalizeCredits(raw.credits?.cast, "cast"),
      crew: normalizeCredits(raw.credits?.crew, "crew"),
      videos: normalizeVideos(raw.videos?.results),
      seasons: array(raw.seasons).map(normalizeSeason),
      recommendations: normalizeMediaList(raw.recommendations?.results, "tv"),
      similar: normalizeMediaList(raw.similar?.results, "tv"),
    };
  }

  async season(tvId: number, seasonNumber: number): Promise<Season> {
    positiveId(tvId);
    if (!Number.isInteger(seasonNumber) || seasonNumber < 0) throw new TmdbError("Invalid season number.", 400, "INVALID_PARAMETER");
    const raw = await this.request<Record<string, any>>(`/tv/${tvId}/season/${seasonNumber}`, {}, 600_000);
    const season = normalizeSeason(raw);
    season.episodes = array(raw.episodes).map((episode) => ({
      id: number(episode.id), name: string(episode.name), overview: string(episode.overview),
      episodeNumber: number(episode.episode_number), seasonNumber: number(episode.season_number),
      airDate: nullableString(episode.air_date), runtime: nullableNumber(episode.runtime),
      stillPath: nullableString(episode.still_path), rating: number(episode.vote_average),
    }));
    return season;
  }

  async genres(type: MediaType): Promise<Genre[]> {
    const data = await this.request<{ genres?: Array<{ id: number; name: string }> }>(`/genre/${type}/list`, {}, 86_400_000);
    return (data.genres ?? []).map((genre) => ({ id: genre.id, name: genre.name }));
  }

  async person(id: number): Promise<PersonDetails> {
    positiveId(id);
    const raw = await this.request<Record<string, any>>(`/person/${id}`, { append_to_response: "combined_credits" }, 600_000);
    return {
      id: number(raw.id), name: string(raw.name), biography: string(raw.biography),
      birthday: nullableString(raw.birthday), deathday: nullableString(raw.deathday),
      placeOfBirth: nullableString(raw.place_of_birth), profilePath: nullableString(raw.profile_path),
      knownFor: normalizeMediaList(raw.combined_credits?.cast).sort((a, b) => b.popularity - a.popularity).slice(0, 20),
    };
  }

  clearCache() { this.cache.clear(); }

  private async mediaPage(path: string, params: Record<string, unknown>, type: MediaType, ttl?: number): Promise<Page<MediaSummary>> {
    const data = await this.request<TmdbPage>(path, params, ttl);
    return normalizePage(data, normalizeMediaList(data.results, type));
  }

  private async request<T>(path: string, params: Record<string, unknown> = {}, ttl = this.cacheTtlMs): Promise<T> {
    if (!/^\/[a-zA-Z0-9/_-]+$/.test(path)) throw new TmdbError("Invalid TMDB endpoint.", 400, "INVALID_ENDPOINT");
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    if (!this.options.accessToken) url.searchParams.set("api_key", this.options.apiKey!);
    const cacheKey = url.toString();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) this.cache.delete(cacheKey);

    await this.acquire();
    try {
      let lastError: unknown;
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const headers = new Headers({ Accept: "application/json" });
          if (this.options.accessToken) headers.set("Authorization", `Bearer ${this.options.accessToken}`);
          const response = await this.fetchImpl(url, { headers, signal: controller.signal, cache: "no-store" });
          if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
            await delay(retryDelay(response, attempt));
            continue;
          }
          if (!response.ok) {
            if (response.status === 404) throw new TmdbError("The requested TMDB record was not found.", 404, "TMDB_NOT_FOUND");
            if (response.status === 401 || response.status === 403) throw new TmdbError("TMDB rejected the configured credentials.", 502, "TMDB_AUTH_FAILED");
            throw new TmdbError(`TMDB request failed (${response.status}).`, 502, "TMDB_UPSTREAM_ERROR");
          }
          const data = await response.json() as T;
          this.cache.set(cacheKey, { value: data, expiresAt: Date.now() + ttl });
          return data;
        } catch (error) {
          lastError = error;
          if (error instanceof TmdbError) throw error;
          if (attempt >= this.maxRetries) break;
          await delay(200 * 2 ** attempt);
        } finally {
          clearTimeout(timeout);
        }
      }
      throw new TmdbError(lastError instanceof Error && lastError.name === "AbortError" ? "TMDB timed out. Please try again." : "TMDB is temporarily unavailable.", 503, "TMDB_UNAVAILABLE");
    } finally {
      this.release();
    }
  }

  private async acquire() {
    if (this.activeRequests < 4) { this.activeRequests++; return; }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.activeRequests++;
  }

  private release() {
    this.activeRequests--;
    this.waiting.shift()?.();
  }
}

export function normalizeMedia(raw: Record<string, any>, typeHint?: MediaType): MediaSummary | null {
  const id = number(raw.id);
  if (!id) return null;
  const type: MediaType = raw.media_type === "tv" || typeHint === "tv" ? "tv" : "movie";
  return {
    id, type,
    title: string(type === "movie" ? raw.title || raw.name : raw.name || raw.title),
    originalTitle: string(type === "movie" ? raw.original_title || raw.original_name : raw.original_name || raw.original_title),
    overview: string(raw.overview), posterPath: nullableString(raw.poster_path), backdropPath: nullableString(raw.backdrop_path),
    releaseDate: nullableString(type === "movie" ? raw.release_date : raw.first_air_date),
    rating: number(raw.vote_average), voteCount: number(raw.vote_count),
    genreIds: array(raw.genre_ids).map((idValue) => number(idValue)).filter(Boolean),
    popularity: number(raw.popularity),
  };
}

export function normalizeMediaList(raw: unknown, typeHint?: MediaType): MediaSummary[] {
  return array(raw).flatMap((item) => {
    const normalized = normalizeMedia(item, typeHint ?? (item.media_type === "tv" ? "tv" : item.media_type === "movie" ? "movie" : undefined));
    return normalized ? [normalized] : [];
  });
}

function normalizePage<T>(data: TmdbPage, results: T[]): Page<T> {
  return { page: number(data.page) || 1, totalPages: Math.min(number(data.total_pages), 500), totalResults: number(data.total_results), results };
}

function normalizeGenres(raw: unknown): Genre[] { return array(raw).map((genre) => ({ id: number(genre.id), name: string(genre.name) })).filter((genre) => genre.id && genre.name); }
function normalizeCredits(raw: unknown, kind: "cast" | "crew"): PersonCredit[] {
  return array(raw).slice(0, kind === "cast" ? 24 : 40).flatMap((credit) => {
    const base = { id: number(credit.id), name: string(credit.name), profilePath: nullableString(credit.profile_path) };
    if (!base.id || !base.name) return [];
    return [kind === "cast" ? { ...base, character: string(credit.character) } : { ...base, job: string(credit.job) }];
  });
}
function normalizeVideos(raw: unknown) {
  return array(raw).map((video) => ({ id: string(video.id), key: string(video.key), name: string(video.name), site: string(video.site), type: string(video.type), official: Boolean(video.official) })).filter((video) => video.id && video.key);
}
function normalizeSeason(raw: Record<string, any>): Season {
  return { id: number(raw.id), name: string(raw.name), overview: string(raw.overview), seasonNumber: number(raw.season_number), episodeCount: number(raw.episode_count ?? raw.episodes?.length), airDate: nullableString(raw.air_date), posterPath: nullableString(raw.poster_path) };
}
function positiveId(id: number) { if (!Number.isInteger(id) || id < 1) throw new TmdbError("Invalid TMDB identifier.", 400, "INVALID_PARAMETER"); }
function retryDelay(response: Response, attempt: number) { const retryAfter = Number(response.headers.get("retry-after")); return Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2000) : 200 * 2 ** attempt; }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function array(raw: unknown): Record<string, any>[] { return Array.isArray(raw) ? raw.filter((item) => item && typeof item === "object") : []; }
function string(value: unknown): string { return typeof value === "string" ? value : ""; }
function nullableString(value: unknown): string | null { return typeof value === "string" && value ? value : null; }
function number(value: unknown): number { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function nullableNumber(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

export { persistMovieMetadata, persistTvMetadata } from "./persistence";
