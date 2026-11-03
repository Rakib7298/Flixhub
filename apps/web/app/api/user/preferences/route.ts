import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";
import { preferenceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const preference = await db.userPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    return NextResponse.json({ preference }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, preferenceSchema);
    const preference = await db.userPreference.upsert({ where: { userId: user.id }, update: input, create: { userId: user.id, ...input } });
    return NextResponse.json({ preference });
  } catch (error) { return handleApiError(error); }
}
