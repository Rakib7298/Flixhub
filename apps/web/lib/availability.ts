import { readServerEnv } from "@mediamatrix/config";
import { StreamingAvailabilityClient } from "@mediamatrix/streaming-availability";
import type { MediaType, StreamingOffer } from "@mediamatrix/shared";

const globalAvailability = globalThis as unknown as { availabilityClient?: StreamingAvailabilityClient | null };

export function getAvailabilityClient(): StreamingAvailabilityClient | null {
  if (globalAvailability.availabilityClient !== undefined) return globalAvailability.availabilityClient;
  const env = readServerEnv();
  const provider = env.STREAMING_API_PROVIDER;
  if (!env.STREAMING_AVAILABILITY_API_KEY || !provider || !["movie-of-the-night", "rapidapi"].includes(provider)) {
    globalAvailability.availabilityClient = null;
    return null;
  }
  globalAvailability.availabilityClient = new StreamingAvailabilityClient({
    apiKey: env.STREAMING_AVAILABILITY_API_KEY,
    provider: provider as "movie-of-the-night" | "rapidapi",
    ...(env.STREAMING_API_BASE_URL ? { baseUrl: env.STREAMING_API_BASE_URL } : {}),
  });
  return globalAvailability.availabilityClient;
}

export async function getAvailability(type: MediaType, tmdbId: number, country?: string): Promise<{ configured: boolean; offers: StreamingOffer[]; error?: string; country: string }> {
  const env = readServerEnv();
  const selectedCountry = (country || env.STREAMING_DEFAULT_COUNTRY).toUpperCase();
  const client = getAvailabilityClient();
  if (!client) return { configured: false, offers: [], country: selectedCountry };
  try { return { configured: true, offers: await client.getOffers(type, tmdbId, selectedCountry), country: selectedCountry }; }
  catch { return { configured: true, offers: [], country: selectedCountry, error: "The availability provider could not be reached. No viewing options are shown because the current data could not be verified." }; }
}
