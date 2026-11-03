import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireUser } from "@/lib/api";
import { watchlistSchema } from "@/lib/validation";
import { getTmdbClient } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await db.watchlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, watchlistSchema);
    const mediaKey = `${input.mediaType}:${input.tmdbId}`;
    if (input.action === "remove") {
      await db.watchlist.deleteMany({ where: { userId: user.id, mediaKey } });
      return NextResponse.json({ saved: false });
    }
    let title = input.title;
    let posterPath = input.posterPath;
    const client = getTmdbClient();
    if (client) {
      const media = input.mediaType === "movie" ? await client.movie(input.tmdbId) : await client.tv(input.tmdbId);
      title = media.title;
      posterPath = media.posterPath;
    }
    if (!title) return NextResponse.json({ error: { code: "METADATA_REQUIRED", message: "Connect TMDB or provide valid title metadata to add this item." } }, { status: 400 });
    const item = await db.watchlist.upsert({
      where: { userId_mediaKey: { userId: user.id, mediaKey } },
      update: { title, posterPath },
      create: { userId: user.id, mediaKey, mediaType: input.mediaType, tmdbId: input.tmdbId, title, posterPath },
    });
    return NextResponse.json({ saved: true, item }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
