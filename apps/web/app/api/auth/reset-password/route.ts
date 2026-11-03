import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@mediamatrix/database";
import { ApiError, assertSameOrigin, handleApiError, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "password-reset", { limit: 8, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    assertSameOrigin(request);
    const input = await parseBody(request, resetPasswordSchema);
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || record.user.email !== input.email || record.user.deletedAt) return NextResponse.json({ error: { code: "INVALID_TOKEN", message: "This recovery link is invalid or has expired." } }, { status: 400 });
    const passwordHash = await hash(input.password, 12);
    await db.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new ApiError(400, "INVALID_TOKEN", "This recovery link is invalid or has expired.");
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } });
      await tx.auditLog.create({ data: { actorId: record.userId, action: "account.password_reset", entity: "User", entityId: record.userId, metadata: {} } });
    });
    return NextResponse.json({ message: "Password updated. Sign in with your new password." });
  } catch (error) { return handleApiError(error, request); }
}
