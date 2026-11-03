import { NextResponse } from "next/server";
import { handleApiError, requireAdmin, ApiError } from "@/lib/api";
import { getJellyfinClient } from "@/lib/jellyfin";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { await requireAdmin(); const client = getJellyfinClient(); if (!client) throw new ApiError(503, "NOT_CONFIGURED", "Jellyfin is not configured."); return NextResponse.json({ items: await client.libraries() }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return handleApiError(error, request); }
}
