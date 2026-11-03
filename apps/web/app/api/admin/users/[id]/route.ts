import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { ApiError, assertSameOrigin, handleApiError, parseBody, requireAdmin } from "@/lib/api";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const admin = await requireAdmin(); const { id } = await params;
    const input = await parseBody(request, z.object({ role: z.enum(["ADMIN", "USER"]).optional(), active: z.boolean().optional() }).strict().refine((value) => value.role !== undefined || value.active !== undefined));
    if (!z.string().cuid().safeParse(id).success) throw new ApiError(400, "INVALID_ID", "Invalid user ID.");
    const target = await db.user.findUnique({ where: { id }, include: { role: true } }); if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");
    if (target.id === admin.id && (input.active === false || (input.role && input.role !== "ADMIN"))) throw new ApiError(400, "SELF_LOCKOUT", "You cannot remove your own administrator access or deactivate this session.");
    const roleName = input.role ?? "USER";
    if (input.role) await db.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
    const updated = await db.user.update({ where: { id }, data: { ...(input.role ? { roleName } : {}), ...(input.active === undefined ? {} : { deletedAt: input.active ? null : new Date(), ...(input.active ? {} : { sessionVersion: { increment: 1 } }) }) }, include: { role: true } });
    await db.auditLog.create({ data: { actorId: admin.id, action: "admin.user_updated", entity: "User", entityId: id, metadata: { role: input.role, active: input.active } } });
    return NextResponse.json({ user: { id: updated.id, role: updated.role.name, active: !updated.deletedAt } });
  } catch (error) { return handleApiError(error, request); }
}
