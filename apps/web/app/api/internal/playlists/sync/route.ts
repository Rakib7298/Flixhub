import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseBody, ApiError } from "@/lib/api";
import { refreshPlaylistRecord } from "@/lib/playlists";

export async function POST(request: NextRequest) {
  try {
    const configured = process.env.SYNC_CRON_SECRET;
    if (!configured) throw new ApiError(503, "NOT_CONFIGURED", "Scheduled synchronization is not configured.");
    const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const expectedBuffer = Buffer.from(configured); const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) throw new ApiError(401, "UNAUTHORIZED", "Valid worker credentials are required.");
    const input = await parseBody(request, z.object({ playlistId: z.string().cuid() }).strict());
    const result = await refreshPlaylistRecord(input.playlistId, null);
    return NextResponse.json(result);
  } catch (error) { return handleApiError(error); }
}
