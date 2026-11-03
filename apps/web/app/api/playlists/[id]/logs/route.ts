import { NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { ApiError, handleApiError, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    const playlist = await db.playlist.findUnique({ where: { id } });
    if (!playlist || (playlist.ownerId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "NOT_FOUND", "Playlist not found.");
    const items = await db.playlistSyncLog.findMany({ where: { playlistId: id }, orderBy: { startedAt: "desc" }, take: 50 });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}
