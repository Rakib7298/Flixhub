import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "register", { limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return NextResponse.json({ error: { code: "NOT_CONFIGURED", message: "Account registration is not configured on this deployment." } }, { status: 503 });
    const input = await parseBody(request, registerSchema);
    const passwordHash = await hash(input.password, 12);
    const user = await db.$transaction(async (tx) => {
      const role = await tx.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
      const created = await tx.user.create({
        data: { email: input.email, username: input.username, name: input.name, passwordHash, roleId: role.id, preference: { create: {} } },
        select: { id: true, email: true, username: true, name: true, createdAt: true },
      });
      await tx.auditLog.create({ data: { actorId: created.id, action: "account.registered", entity: "User", entityId: created.id, metadata: {} } });
      return created;
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
