import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";
import { progressSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await db.playbackProgress.findMany({ where: { userId: user.id, duration: { gt: 0 } }, orderBy: { updatedAt: "desc" }, take: 20 });
    return NextResponse.json({ items: items.filter((item) => item.seconds / item.duration < 0.96) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, progressSchema);
    const seconds = Math.min(input.seconds, input.duration || input.seconds);
    const item = await db.playbackProgress.upsert({
      where: { userId_mediaKey: { userId: user.id, mediaKey: input.mediaKey } },
      update: { seconds, duration: input.duration, title: input.title, posterPath: input.posterPath },
      create: { userId: user.id, ...input, seconds },
    });
    if (input.duration > 0 && seconds / input.duration >= 0.9) {
      await db.watchHistory.create({ data: { userId: user.id, mediaKey: input.mediaKey, title: input.title } });
    }
    return NextResponse.json({ item });
  } catch (error) { return handleApiError(error); }
}
