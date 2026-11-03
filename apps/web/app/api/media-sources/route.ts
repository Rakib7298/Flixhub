import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { auth } from "@/auth";
import { handleApiError, requireUser } from "@/lib/api";
import { decryptSecret } from "@/lib/security";
import { hasSensitiveUrlParameters } from "@mediamatrix/playlist-manager";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type"); const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"));
    if (!["movie", "tv"].includes(type || "") || !Number.isInteger(tmdbId) || tmdbId < 1) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "A valid media type and TMDB ID are required." } }, { status: 400 });
    const session = await auth(); const user = session?.user ? await requireUser() : null;
    const parent = type === "movie" ? await db.movie.findUnique({ where: { tmdbId } }) : await db.tvSeries.findUnique({ where: { tmdbId } });
    if (!parent) return NextResponse.json({ items: [] });
    const records = await db.mediaSource.findMany({ where: { ...(type === "movie" ? { movieId: parent.id } : { tvSeriesId: parent.id }), isActive: true, deletedAt: null, ...(user ? {} : { requiresAuth: false }) }, orderBy: { label: "asc" } });
    const items = records.flatMap((source) => { const url = decryptSecret(source.sourceUrlCiphertext); if (!source.requiresAuth && hasSensitiveUrlParameters(url)) return []; return [{ id: source.id, label: source.label, url, format: source.format, requiresAuth: source.requiresAuth }]; });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}
