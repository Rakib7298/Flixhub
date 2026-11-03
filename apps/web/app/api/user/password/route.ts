import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";
import { passwordSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "password-change", { limit: 8, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, z.object({ currentPassword: z.string().min(1).max(128), password: passwordSchema }).strict());
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!await compare(input.currentPassword, record.passwordHash)) return NextResponse.json({ error: { code: "INVALID_PASSWORD", message: "Your current password is incorrect." } }, { status: 400 });
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hash(input.password, 12), sessionVersion: { increment: 1 } } });
    await db.auditLog.create({ data: { actorId: user.id, action: "account.password_changed", entity: "User", entityId: user.id, metadata: {} } });
    return NextResponse.json({ message: "Password updated. Sign in again on all devices." });
  } catch (error) { return handleApiError(error); }
}
