import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, z.object({ name: z.string().trim().min(1).max(80) }).strict());
    const updated = await db.user.update({ where: { id: user.id }, data: { name: input.name }, select: { id: true, email: true, username: true, name: true } });
    return NextResponse.json({ user: updated });
  } catch (error) { return handleApiError(error); }
}
