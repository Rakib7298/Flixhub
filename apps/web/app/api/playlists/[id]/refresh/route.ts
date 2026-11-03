import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { ApiError, assertSameOrigin, handleApiError, requireUser } from "@/lib/api";
import { refreshPlaylistRecord } from "@/lib/playlists";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, "playlist-refresh", { limit: 30, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    assertSameOrigin(request); const user = await requireUser(); const { id } = await params;
    const playlist = await db.playlist.findUnique({ where: { id } });
    if (!playlist || (playlist.ownerId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "NOT_FOUND", "Playlist not found.");
    if (playlist.sourceType === "UPLOAD") throw new ApiError(400, "REMOTE_SOURCE_REQUIRED", "Uploaded playlists cannot be refreshed remotely. Upload a replacement instead.");
    const result = await refreshPlaylistRecord(id, user);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) return handleApiError(error);
    return handleApiError(new ApiError(422, "SYNC_FAILED", "Playlist synchronization failed. Existing channels were preserved; check the sanitized sync status for details."));
  }
}
