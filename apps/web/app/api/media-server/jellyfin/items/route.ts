import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAdmin, ApiError } from "@/lib/api";
import { getJellyfinClient } from "@/lib/jellyfin";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { await requireAdmin(); const client = getJellyfinClient(); if (!client) throw new ApiError(503, "NOT_CONFIGURED", "Jellyfin is not configured."); const parentId = request.nextUrl.searchParams.get("parentId")?.trim(); if (parentId && !/^[a-zA-Z0-9]{8,128}$/.test(parentId)) throw new ApiError(400, "INVALID_ID", "Invalid library identifier."); return NextResponse.json({ items: await client.items(parentId) }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return handleApiError(error); }
}
