import { db, Prisma } from "@mediamatrix/database";
import type { PlaylistChannel } from "@mediamatrix/shared";
import { fetchGithubPlaylist } from "@mediamatrix/github-sync";
import { fetchPlaylist, hasSensitiveUrlParameters, parseM3U } from "@mediamatrix/playlist-manager";
import { decryptSecret, encryptSecret, sensitiveHash } from "./security";
import type { AuthenticatedUser } from "./api";

export function playlistLimits() {
  return {
    maxBytes: Math.min(Number(process.env.PLAYLIST_MAX_BYTES) || 5_242_880, 50_000_000),
    timeoutMs: Math.min(Number(process.env.PLAYLIST_FETCH_TIMEOUT_MS) || 15_000, 60_000),
  };
}

export async function refreshPlaylistRecord(playlistId: string, actor: AuthenticatedUser | null) {
  const playlist = await db.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist || (actor !== null && playlist.ownerId !== actor.id && actor.role !== "ADMIN")) throw new Error("Playlist not found or access denied.");
  if (playlist.sourceType === "UPLOAD") throw new Error("Uploaded playlists cannot be refreshed remotely. Upload a new authorized file instead.");
  const log = await db.playlistSyncLog.create({ data: { playlistId, status: "RUNNING", message: "Synchronization started" } });
  try {
    const limits = playlistLimits();
    let content: string; let contentHash: string; let githubSha: string | undefined;
    if (playlist.sourceType === "GITHUB") {
      if (!playlist.githubRepository || !playlist.githubBranch || !playlist.githubFilePath) throw new Error("GitHub source configuration is incomplete.");
      const result = await fetchGithubPlaylist({ repository: playlist.githubRepository, branch: playlist.githubBranch, path: playlist.githubFilePath, ...(process.env.GITHUB_TOKEN ? { token: process.env.GITHUB_TOKEN } : {}), ...limits });
      content = result.content; contentHash = result.contentHash; githubSha = result.sha;
    } else {
      if (!playlist.sourceUrlCiphertext) throw new Error("Playlist source URL is unavailable.");
      const sourceUrl = decryptSecret(playlist.sourceUrlCiphertext);
      const result = await fetchPlaylist(sourceUrl, { ...limits, allowPrivateNetwork: playlist.allowPrivateNetwork && process.env.PLAYLIST_ALLOW_PRIVATE_NETWORK === "true" });
      content = result.content; contentHash = result.contentHash;
    }
    const parsed = parseM3U(content);
    if (!parsed.channels.length) throw new Error("No valid channels were found; existing channels were left unchanged.");
    if (playlist.isPublic) assertPublicChannels(parsed.channels);
    await db.$transaction(async (tx) => {
      await upsertChannels(tx, playlistId, parsed.channels);
      await tx.playlist.update({ where: { id: playlistId }, data: { contentHash, ...(githubSha ? { githubLastContentSha: githubSha } : {}), status: playlist.enabled ? "ACTIVE" : "DISABLED", lastSyncAt: new Date(), lastError: null } });
      await tx.playlistSyncLog.update({ where: { id: log.id }, data: { status: "SUCCESS", message: `Synchronized ${parsed.channels.length} channels; ${parsed.duplicateCount} duplicates skipped`, itemCount: parsed.channels.length, finishedAt: new Date() } });
    }, { timeout: 60_000 });
    await db.auditLog.create({ data: { actorId: actor?.id, action: actor ? "playlist.synchronized" : "playlist.scheduled_synchronization", entity: "Playlist", entityId: playlistId, metadata: { itemCount: parsed.channels.length, duplicateCount: parsed.duplicateCount } } });
    return { itemCount: parsed.channels.length, duplicateCount: parsed.duplicateCount, issues: parsed.issues, contentHash };
  } catch (error) {
    const message = safeSyncError(error);
    await db.$transaction([
      db.playlist.update({ where: { id: playlistId }, data: { status: "ERROR", lastError: message } }),
      db.playlistSyncLog.update({ where: { id: log.id }, data: { status: "ERROR", message, finishedAt: new Date() } }),
    ]).catch(() => undefined);
    throw error;
  }
}

export async function storePlaylistChannels(playlistId: string, channels: PlaylistChannel[]) {
  return db.$transaction(async (tx) => {
    await upsertChannels(tx, playlistId, channels);
    await tx.playlist.update({ where: { id: playlistId }, data: { lastSyncAt: new Date(), status: "ACTIVE" } });
  }, { timeout: 60_000 });
}

async function upsertChannels(tx: Prisma.TransactionClient, playlistId: string, channels: PlaylistChannel[]) {
  const data = channels.map((channel, index) => ({
    playlistId, channelKey: channel.id, name: channel.name,
    streamUrlCiphertext: encryptSecret(channel.url), streamUrlHash: sensitiveHash(channel.url),
    logoUrl: channel.logo, groupName: channel.group, tvgId: channel.tvgId,
    metadata: channel.rawMetadata, position: index, isActive: true,
  }));
  await tx.playlistItem.updateMany({ where: { playlistId }, data: { isActive: false } });
  for (let index = 0; index < data.length; index += 50) {
    await Promise.all(data.slice(index, index + 50).map((item) => tx.playlistItem.upsert({
      where: { playlistId_channelKey: { playlistId, channelKey: item.channelKey } },
      update: { name: item.name, streamUrlCiphertext: item.streamUrlCiphertext, streamUrlHash: item.streamUrlHash, logoUrl: item.logoUrl, groupName: item.groupName, tvgId: item.tvgId, metadata: item.metadata, position: item.position, isActive: true },
      create: item,
    })));
  }
}

export function assertPublicChannels(channels: PlaylistChannel[]) {
  if (channels.some((channel) => hasSensitiveUrlParameters(channel.url) || (channel.logo && hasSensitiveUrlParameters(channel.logo)))) throw new Error("A public playlist cannot contain credential-like URL parameters. Keep this playlist private or remove sensitive URLs.");
}

export async function assertPlaylistCanBePublic(playlistId: string) {
  const items = await db.playlistItem.findMany({ where: { playlistId, isActive: true } });
  for (const item of items) {
    if (hasSensitiveUrlParameters(decryptSecret(item.streamUrlCiphertext)) || (item.logoUrl && hasSensitiveUrlParameters(item.logoUrl))) throw new Error("This playlist contains credential-like stream parameters and cannot be made public.");
  }
}

export function encryptedSourceFields(url: string) {
  return { sourceUrlCiphertext: encryptSecret(url), sourceUrlHash: sensitiveHash(url) };
}

function safeSyncError(error: unknown) {
  return (error instanceof Error ? error.message : "Playlist synchronization failed").replace(/https?:\/\/[^\s]+/gi, "[source]").slice(0, 300);
}
