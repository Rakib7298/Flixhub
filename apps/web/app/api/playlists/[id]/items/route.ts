import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { auth } from "@/auth";
import { ApiError, handleApiError, requireUser } from "@/lib/api";
import { decryptSecret } from "@/lib/security";
import { hasSensitiveUrlParameters } from "@mediamatrix/playlist-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const user = session?.user ? await requireUser() : null;
    const playlist = await db.playlist.findUnique({ where: { id } });
    const isOwner = user && (playlist?.ownerId === user.id || user.role === "ADMIN");
    if (!playlist || !playlist.enabled || (!playlist.isPublic && !isOwner)) throw new ApiError(404, "NOT_FOUND", "Playlist not found or access denied.");
    const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120);
    const group = request.nextUrl.searchParams.get("group")?.trim().slice(0, 200);
    const page = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("page")) || 1, 1000));
    const take = 250;
    const where = { playlistId: id, isActive: true, ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}), ...(group ? { groupName: group } : {}) };
    const [records, total, groupRecords] = await Promise.all([
      db.playlistItem.findMany({ where, orderBy: [{ groupName: "asc" }, { position: "asc" }], skip: (page - 1) * take, take }),
      db.playlistItem.count({ where }),
      db.playlistItem.findMany({ where: { playlistId: id, isActive: true }, distinct: ["groupName"], select: { groupName: true }, orderBy: { groupName: "asc" } }),
    ]);
    const items = records.flatMap((item) => {
      const url = decryptSecret(item.streamUrlCiphertext);
      if (playlist.isPublic && !isOwner && hasSensitiveUrlParameters(url)) return [];
      return [{ id: item.id, channelKey: item.channelKey, name: item.name, url, logo: item.logoUrl, group: item.groupName, tvgId: item.tvgId }];
    });
    return NextResponse.json({ items, groups: groupRecords.map((item) => item.groupName), page, totalPages: Math.max(1, Math.ceil(total / take)), total }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error, request); }
}
