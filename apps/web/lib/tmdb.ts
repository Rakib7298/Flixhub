import { TmdbClient } from "@mediamatrix/tmdb";
import { readServerEnv } from "@mediamatrix/config";

const globalForTmdb = globalThis as unknown as { tmdbClient?: TmdbClient | null };

export function getTmdbClient(): TmdbClient | null {
  if (globalForTmdb.tmdbClient !== undefined) return globalForTmdb.tmdbClient;
  const env = readServerEnv();
  if (!env.TMDB_ACCESS_TOKEN && !env.TMDB_API_KEY) {
    globalForTmdb.tmdbClient = null;
    return null;
  }
  globalForTmdb.tmdbClient = new TmdbClient({
    ...(env.TMDB_ACCESS_TOKEN ? { accessToken: env.TMDB_ACCESS_TOKEN } : {}),
    ...(env.TMDB_API_KEY ? { apiKey: env.TMDB_API_KEY } : {}),
    baseUrl: env.TMDB_API_BASE_URL,
  });
  return globalForTmdb.tmdbClient;
}

export function requireTmdbClient(): TmdbClient {
  const client = getTmdbClient();
  if (!client) throw new Error("TMDB is not configured. Set TMDB_ACCESS_TOKEN or TMDB_API_KEY on the server.");
  return client;
}
