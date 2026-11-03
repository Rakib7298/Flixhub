import { NextRequest } from "next/server";
import { getTmdbClient } from "@/lib/tmdb";
import { getAvailability } from "@/lib/availability";
import { publicError, publicJson, publicOptions } from "@/lib/public-api";

export const dynamic = "force-dynamic";
export function OPTIONS() { return publicOptions(); }
export async function GET(request: NextRequest) {
  try { const client = getTmdbClient(); if (!client) throw Object.assign(new Error("TMDB not configured"), { code: "TMDB_NOT_CONFIGURED" }); const id = Number(request.nextUrl.searchParams.get("id")); const type = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie"; if (!Number.isInteger(id) || id < 1) return publicJson({ error: { code: "INVALID_ID", message: "Invalid title ID." } }, 400); const country = request.nextUrl.searchParams.get("country")?.toUpperCase(); const [media, availability] = await Promise.all([type === "movie" ? client.movie(id) : client.tv(id), getAvailability(type, id, country && /^[A-Z]{2}$/.test(country) ? country : undefined)]); return publicJson({ media, availability }); } catch (error) { return publicError(error); }
}
