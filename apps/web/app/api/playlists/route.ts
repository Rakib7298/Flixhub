import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { fetchGithubPlaylist } from "@mediamatrix/github-sync";
import { fetchPlaylist, parseM3U } from "@mediamatrix/playlist-manager";
import { ApiError, assertSameOrigin, handleApiError, parseBody, readBodyBytes, requireUser } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { assertPublicChannels, encryptedSourceFields, playlistLimits, storePlaylistChannels } from "@/lib/playlists";

export const dynamic = "force-dynamic";

const base = { name: z.string().trim().min(1).max(120), isPublic: z.boolean().default(false), refreshMinutes: z.number().int().min(15).max(10_080).default(360), allowPrivateNetwork: z.boolean().default(false) };
const playlistSchema = z.discriminatedUnion("sourceType", [
  z.object({ ...base, sourceType: z.literal("URL"), url: z.string().url().max(2048) }).strict(),
  z.object({ ...base, sourceType: z.literal("GITHUB"), repository: z.string().max(150), branch: z.string().max(200), path: z.string().max(400) }).strict(),
]);

export async function GET() {
  try {
    const user = await requireUser();
    const items = await db.playlist.findMany({
      where: { OR: [{ ownerId: user.id }, { isPublic: true, enabled: true }] },
      orderBy: [{ ownerId: "desc" }, { updatedAt: "desc" }],
      select: { id: true, ownerId: true, name: true, sourceType: true, isPublic: true, enabled: true, status: true, refreshMinutes: true, lastSyncAt: true, lastError: true, githubRepository: true, githubBranch: true, githubFilePath: true, _count: { select: { items: { where: { isActive: true } } } } },
    });
    return NextResponse.json({ items: items.map(({ _count, ...item }) => ({ ...item, itemCount: _count.items, isOwner: item.ownerId === user.id })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "playlist-create", { limit: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (request.headers.get("content-type")?.includes("multipart/form-data")) return await createUpload(request, user);
    const input = await parseBody(request, playlistSchema, 32_768);
    if (input.isPublic && user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Only administrators can publish playlists.");
    if (input.sourceType === "GITHUB" && user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "GitHub playlist sources are restricted to administrators.");
    const limits = playlistLimits();
    let content: string; let contentHash: string; let githubSha: string | undefined; let sourceFields = {}; let allowPrivateNetwork = false;
    if (input.sourceType === "URL") {
      allowPrivateNetwork = input.allowPrivateNetwork === true && user.role === "ADMIN" && process.env.PLAYLIST_ALLOW_PRIVATE_NETWORK === "true";
      if (input.allowPrivateNetwork && !allowPrivateNetwork) throw new ApiError(403, "PRIVATE_NETWORK_DISABLED", "Private network sources require an administrator and PLAYLIST_ALLOW_PRIVATE_NETWORK=true.");
      const fetched = await fetchPlaylist(input.url, { ...limits, allowPrivateNetwork });
      content = fetched.content; contentHash = fetched.contentHash; sourceFields = encryptedSourceFields(input.url);
    } else {
      const fetched = await fetchGithubPlaylist({ repository: input.repository, branch: input.branch, path: input.path, ...(process.env.GITHUB_TOKEN ? { token: process.env.GITHUB_TOKEN } : {}), ...limits });
      content = fetched.content; contentHash = fetched.contentHash; githubSha = fetched.sha;
    }
    const parsed = parseM3U(content);
    if (!parsed.channels.length) throw new ApiError(422, "NO_VALID_CHANNELS", "No valid channels were found in this playlist.", { issues: parsed.issues });
    if (input.isPublic) assertPublicChannels(parsed.channels);
    const playlist = await db.playlist.create({ data: {
      ownerId: user.id, name: input.name, sourceType: input.sourceType, ...sourceFields, contentHash,
      isPublic: input.isPublic, allowPrivateNetwork, refreshMinutes: input.refreshMinutes, lastSyncAt: new Date(),
      ...(input.sourceType === "GITHUB" ? { githubRepository: input.repository, githubBranch: input.branch, githubFilePath: input.path, githubLastContentSha: githubSha } : {}),
    } });
    try {
      await storePlaylistChannels(playlist.id, parsed.channels);
      await db.playlistSyncLog.create({ data: { playlistId: playlist.id, status: "SUCCESS", message: `Imported ${parsed.channels.length} channels; ${parsed.duplicateCount} duplicates skipped`, itemCount: parsed.channels.length, finishedAt: new Date() } });
    } catch (error) { await db.playlist.delete({ where: { id: playlist.id } }).catch(() => undefined); throw error; }
    await db.auditLog.create({ data: { actorId: user.id, action: "playlist.created", entity: "Playlist", entityId: playlist.id, metadata: { sourceType: input.sourceType, itemCount: parsed.channels.length } } });
    return NextResponse.json({ playlist: { id: playlist.id, name: playlist.name, itemCount: parsed.channels.length }, duplicateCount: parsed.duplicateCount, issues: parsed.issues }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

async function createUpload(request: NextRequest, user: Awaited<ReturnType<typeof requireUser>>) {
  const limits = playlistLimits();
  const bytes = await readBodyBytes(request, limits.maxBytes + 65_536);
  const boundedRequest = new NextRequest(request.url, { method: "POST", headers: request.headers, body: new Uint8Array(bytes) });
  const form = await boundedRequest.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "FILE_REQUIRED", "Select an authorized M3U or M3U8 file.");
  if (!/\.m3u8?$/i.test(file.name)) throw new ApiError(400, "INVALID_FILE_TYPE", "Only .m3u and .m3u8 files are accepted.");
  if (file.size <= 0 || file.size > limits.maxBytes) throw new ApiError(413, "INVALID_FILE_SIZE", "Playlist file is empty or exceeds the configured size limit.");
  const name = String(form.get("name") || file.name.replace(/\.m3u8?$/i, "")).trim().slice(0, 120);
  const isPublic = form.get("isPublic") === "true";
  if (isPublic && user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Only administrators can publish playlists.");
  if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Playlist name is required.");
  const parsed = parseM3U(await file.text());
  if (!parsed.channels.length) throw new ApiError(422, "NO_VALID_CHANNELS", "No valid channels were found in this file.", { issues: parsed.issues });
  if (isPublic) assertPublicChannels(parsed.channels);
  const playlist = await db.playlist.create({ data: { ownerId: user.id, name, sourceType: "UPLOAD", isPublic, lastSyncAt: new Date() } });
  try { await storePlaylistChannels(playlist.id, parsed.channels); await db.playlistSyncLog.create({ data: { playlistId: playlist.id, status: "SUCCESS", message: `Imported ${parsed.channels.length} channels from an uploaded file`, itemCount: parsed.channels.length, finishedAt: new Date() } }); }
  catch (error) { await db.playlist.delete({ where: { id: playlist.id } }).catch(() => undefined); throw error; }
  await db.auditLog.create({ data: { actorId: user.id, action: "playlist.uploaded", entity: "Playlist", entityId: playlist.id, metadata: { itemCount: parsed.channels.length } } });
  return NextResponse.json({ playlist: { id: playlist.id, name, itemCount: parsed.channels.length }, duplicateCount: parsed.duplicateCount, issues: parsed.issues }, { status: 201 });
}
