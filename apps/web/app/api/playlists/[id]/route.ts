import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { ApiError, assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";
import { assertPlaylistCanBePublic } from "@/lib/playlists";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(); const { id } = await params;
    const playlist = await db.playlist.findUnique({ where: { id } });
    if (!playlist || (playlist.ownerId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "NOT_FOUND", "Playlist not found.");
    const input = await parseBody(request, z.object({ name: z.string().trim().min(1).max(120).optional(), enabled: z.boolean().optional(), isPublic: z.boolean().optional(), refreshMinutes: z.number().int().min(15).max(10_080).optional() }).strict().refine((value) => Object.keys(value).length > 0));
    if (input.isPublic !== undefined && user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Only administrators can change public visibility.");
    if (input.isPublic && !playlist.isPublic) await assertPlaylistCanBePublic(id);
    const updated = await db.playlist.update({ where: { id }, data: { ...input, ...(input.enabled !== undefined ? { status: input.enabled ? "ACTIVE" : "DISABLED" } : {}) }, select: { id: true, name: true, enabled: true, isPublic: true, status: true, refreshMinutes: true } });
    await db.auditLog.create({ data: { actorId: user.id, action: "playlist.updated", entity: "Playlist", entityId: id, metadata: { fields: Object.keys(input) } } });
    return NextResponse.json({ playlist: updated });
  } catch (error) { return handleApiError(error, request); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(); const { id } = await params;
    const playlist = await db.playlist.findUnique({ where: { id } });
    if (!playlist || (playlist.ownerId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "NOT_FOUND", "Playlist not found.");
    await db.$transaction([db.auditLog.create({ data: { actorId: user.id, action: "playlist.deleted", entity: "Playlist", entityId: id, metadata: {} } }), db.playlist.delete({ where: { id } })]);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return handleApiError(error, request); }
}
