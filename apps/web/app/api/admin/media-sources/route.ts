import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { assertSafeRemoteUrl, hasSensitiveUrlParameters } from "@mediamatrix/playlist-manager";
import { detectPlaybackFormat } from "@mediamatrix/media-engine";
import { ApiError, assertSameOrigin, handleApiError, parseBody, requireAdmin } from "@/lib/api";
import { decryptSecret, encryptSecret, safeSourceLabel, sensitiveHash } from "@/lib/security";

export const dynamic = "force-dynamic";
const schema = z.object({ label: z.string().trim().min(1).max(120), url: z.string().url().max(2048), format: z.enum(["hls", "mp4", "dash", "unknown"]).optional(), requiresAuth: z.boolean().default(true), authorizationConfirmed: z.literal(true), movieId: z.string().cuid().optional(), tvSeriesId: z.string().cuid().optional(), episodeId: z.string().cuid().optional() }).strict().refine((value) => [value.movieId, value.tvSeriesId, value.episodeId].filter(Boolean).length === 1, "Attach the source to exactly one media record.");

export async function GET() {
  try {
    await requireAdmin();
    const sources = await db.mediaSource.findMany({ where: { deletedAt: null }, include: { movie: { select: { title: true, tmdbId: true } }, tvSeries: { select: { name: true, tmdbId: true } }, episode: { select: { name: true, tmdbId: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
    return NextResponse.json({ items: sources.map((source) => ({ id: source.id, label: source.label, sourceLabel: safeSourceLabel(decryptSecret(source.sourceUrlCiphertext)), format: source.format, requiresAuth: source.requiresAuth, isActive: source.isActive, mediaTitle: source.movie?.title ?? source.tvSeries?.name ?? source.episode?.name ?? "Unknown", createdAt: source.createdAt })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const admin = await requireAdmin(); const input = await parseBody(request, schema, 32_768);
    await assertSafeRemoteUrl(input.url, { allowPrivateNetwork: false });
    if (!input.requiresAuth && hasSensitiveUrlParameters(input.url)) throw new ApiError(400, "SENSITIVE_URL", "Public sources cannot contain credential-like URL parameters.");
    const source = await db.mediaSource.create({ data: { label: input.label, sourceUrlCiphertext: encryptSecret(input.url), sourceUrlHash: sensitiveHash(input.url), format: input.format ?? detectPlaybackFormat(input.url), requiresAuth: input.requiresAuth, movieId: input.movieId, tvSeriesId: input.tvSeriesId, episodeId: input.episodeId } });
    await db.auditLog.create({ data: { actorId: admin.id, action: "media_source.created", entity: "MediaSource", entityId: source.id, metadata: { requiresAuth: input.requiresAuth, format: source.format } } });
    return NextResponse.json({ source: { id: source.id, label: source.label } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request); const admin = await requireAdmin(); const input = await parseBody(request, z.object({ id: z.string().cuid(), label: z.string().trim().min(1).max(120).optional(), isActive: z.boolean().optional() }).strict());
    const source = await db.mediaSource.update({ where: { id: input.id }, data: { label: input.label, isActive: input.isActive } });
    await db.auditLog.create({ data: { actorId: admin.id, action: "media_source.updated", entity: "MediaSource", entityId: source.id, metadata: {} } });
    return NextResponse.json({ source: { id: source.id, isActive: source.isActive } });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request); const admin = await requireAdmin(); const input = await parseBody(request, z.object({ id: z.string().cuid() }).strict());
    await db.mediaSource.update({ where: { id: input.id }, data: { isActive: false, deletedAt: new Date() } });
    await db.auditLog.create({ data: { actorId: admin.id, action: "media_source.soft_deleted", entity: "MediaSource", entityId: input.id, metadata: {} } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return handleApiError(error); }
}
