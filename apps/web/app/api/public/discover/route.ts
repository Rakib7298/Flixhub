import { NextRequest } from "next/server";
import { getTmdbClient } from "@/lib/tmdb";
import { integer } from "@/lib/query";
import { publicError, publicJson, publicOptions } from "@/lib/public-api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return publicOptions(); }
export async function GET(request: NextRequest) {
  try { const client = getTmdbClient(); if (!client) throw Object.assign(new Error("TMDB not configured"), { code: "TMDB_NOT_CONFIGURED" }); const type = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie"; const page = Math.min(integer(request.nextUrl.searchParams.get("page") ?? undefined, 1), 500); const result = await client.discover(type, { page }); return publicJson(result); } catch (error) { return publicError(error, request); }
}
