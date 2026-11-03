export type MediaType = "movie" | "tv";
export type UserRole = "USER" | "ADMIN";

export interface Genre {
  id: number;
  name: string;
}

export interface MediaSummary {
  id: number;
  type: MediaType;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  rating: number;
  voteCount: number;
  genreIds: number[];
  popularity: number;
}

export interface PersonCredit {
  id: number;
  name: string;
  profilePath: string | null;
  character?: string;
  job?: string;
}

export interface MediaVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface MovieDetails extends MediaSummary {
  type: "movie";
  runtime: number | null;
  genres: Genre[];
  tagline: string;
  status: string;
  productionCompanies: string[];
  cast: PersonCredit[];
  crew: PersonCredit[];
  videos: MediaVideo[];
  recommendations: MediaSummary[];
  similar: MediaSummary[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episodeNumber: number;
  seasonNumber: number;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  rating: number;
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  episodes?: Episode[];
}

export interface TvDetails extends MediaSummary {
  type: "tv";
  genres: Genre[];
  tagline: string;
  status: string;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  episodeRunTime: number[];
  cast: PersonCredit[];
  crew: PersonCredit[];
  videos: MediaVideo[];
  seasons: Season[];
  recommendations: MediaSummary[];
  similar: MediaSummary[];
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  knownFor: MediaSummary[];
}

export interface Page<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface MultiSearchResult extends MediaSummary {
  mediaKind?: "person";
  knownForDepartment?: string;
}

export type OfferType = "subscription" | "free" | "rent" | "buy";

export interface StreamingOffer {
  providerId: string;
  providerName: string;
  providerLogo: string | null;
  type: OfferType;
  url: string | null;
  quality: string | null;
  lastVerifiedAt: string;
  availableSince?: number;
  expiresOn?: number;
  price?: string;
}

export interface PlaylistChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  group: string;
  tvgId: string | null;
  rawMetadata: Record<string, string>;
}

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes < 1) return "Runtime unavailable";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
}

export function releaseYear(date: string | null | undefined): string {
  return date && /^\d{4}/.test(date) ? date.slice(0, 4) : "TBA";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
