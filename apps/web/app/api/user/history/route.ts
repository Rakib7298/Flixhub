import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";
import { historySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const items = await db.watchHistory.findMany({ where: { userId: user.id }, orderBy: { watchedAt: "desc" }, take: 100 });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error, request); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, historySchema);
    const recent = await db.watchHistory.findFirst({ where: { userId: user.id, mediaKey: input.mediaKey, watchedAt: { gte: new Date(Date.now() - 6 * 60 * 60_000) } } });
    if (recent) return NextResponse.json({ item: recent });
    const item = await db.watchHistory.create({ data: { userId: user.id, ...input } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { return handleApiError(error, request); }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await db.$transaction([
      db.watchHistory.deleteMany({ where: { userId: user.id } }),
      db.auditLog.create({ data: { actorId: user.id, action: "history.cleared", entity: "WatchHistory", metadata: {} } }),
    ]);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return handleApiError(error, request); }
}
