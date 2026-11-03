import { JellyfinClient } from "@mediamatrix/media-server";

export function getJellyfinClient(): JellyfinClient | null {
  const serverUrl = process.env.JELLYFIN_SERVER_URL;
  const apiKey = process.env.JELLYFIN_API_KEY;
  const userId = process.env.JELLYFIN_USER_ID;
  if (!serverUrl || !apiKey || !userId) return null;
  return new JellyfinClient({ serverUrl, apiKey, userId, allowPrivateNetwork: process.env.JELLYFIN_ALLOW_PRIVATE_NETWORK === "true" });
}
