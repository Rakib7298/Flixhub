import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { ApiError, assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try { const user = await requireUser(); const items = await db.favorite.findMany({ where: { userId: user.id, playlistItemId: { not: null } }, orderBy: { createdAt: "desc" } }); return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return handleApiError(error, request); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const user = await requireUser();
    const input = await parseBody(request, z.object({ playlistItemId: z.string().cuid(), action: z.enum(["add", "remove"]) }).strict());
    const channel = await db.playlistItem.findUnique({ where: { id: input.playlistItemId }, include: { playlist: true } });
    if (!channel || !channel.isActive || (!channel.playlist.isPublic && channel.playlist.ownerId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "NOT_FOUND", "Channel not found or access denied.");
    const mediaKey = `channel:${channel.channelKey}`;
    if (input.action === "remove") await db.favorite.deleteMany({ where: { userId: user.id, mediaKey } });
    else await db.favorite.upsert({ where: { userId_mediaKey: { userId: user.id, mediaKey } }, update: { title: channel.name, playlistItemId: channel.id }, create: { userId: user.id, mediaKey, title: channel.name, playlistItemId: channel.id } });
    return NextResponse.json({ saved: input.action === "add" });
  } catch (error) { return handleApiError(error, request); }
}
