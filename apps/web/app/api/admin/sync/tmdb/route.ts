import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { persistMovieMetadata, persistTvMetadata } from "@mediamatrix/tmdb";
import { assertSameOrigin, handleApiError, parseBody, requireAdmin } from "@/lib/api";
import { requireTmdbClient } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "admin-tmdb-sync", { limit: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;
  let jobId: string | undefined;
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const input = await parseBody(request, z.object({ mediaType: z.enum(["movie", "tv"]), tmdbId: z.number().int().positive() }).strict());
    const client = requireTmdbClient();
    const job = await db.backgroundJob.create({ data: { type: "tmdb.sync", payload: input, status: "RUNNING", attempts: 1, lockedAt: new Date() } });
    jobId = job.id;
    if (input.mediaType === "movie") await persistMovieMetadata(await client.movie(input.tmdbId));
    else await persistTvMetadata(await client.tv(input.tmdbId));
    await db.$transaction([
      db.backgroundJob.update({ where: { id: job.id }, data: { status: "COMPLETED" } }),
      db.auditLog.create({ data: { actorId: admin.id, action: "tmdb.synchronized", entity: input.mediaType, entityId: String(input.tmdbId), metadata: {} } }),
    ]);
    return NextResponse.json({ jobId: job.id, status: "COMPLETED", synchronizedAt: new Date().toISOString() });
  } catch (error) {
    if (jobId) await db.backgroundJob.update({ where: { id: jobId }, data: { status: "FAILED", lastError: "Metadata synchronization failed" } }).catch(() => undefined);
    return handleApiError(error, request);
  }
}
