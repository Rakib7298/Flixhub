import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAdmin, ApiError } from "@/lib/api";
import { getJellyfinClient } from "@/lib/jellyfin";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const { id } = await params; const client = getJellyfinClient(); if (!client) throw new ApiError(503, "NOT_CONFIGURED", "Jellyfin is not configured.");
    const upstream = await client.openStream(id, request.headers.get("range"));
    if (!upstream.ok && upstream.status !== 206) { await upstream.body?.cancel(); throw new ApiError(502, "UPSTREAM_ERROR", `Jellyfin stream returned HTTP ${upstream.status}.`); }
    const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) { return handleApiError(error, request); }
}
