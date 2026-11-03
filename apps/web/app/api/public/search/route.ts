import { NextRequest } from "next/server";
import { getTmdbClient } from "@/lib/tmdb";
import { integer, safeText } from "@/lib/query";
import { publicError, publicJson, publicOptions } from "@/lib/public-api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return publicOptions(); }
export async function GET(request: NextRequest) {
  try { const client = getTmdbClient(); if (!client) throw Object.assign(new Error("TMDB not configured"), { code: "TMDB_NOT_CONFIGURED" }); const query = safeText(request.nextUrl.searchParams.get("q") ?? undefined, 100); if (query.length < 2) return publicJson({ error: { code: "QUERY_TOO_SHORT", message: "Enter at least two characters." } }, 400); const result = await client.multiSearch(query, Math.min(integer(request.nextUrl.searchParams.get("page") ?? undefined, 1), 100)); return publicJson({ ...result, results: result.results.flatMap((item) => item.kind === "media" ? [item.media] : []) }); } catch (error) { return publicError(error); }
}
