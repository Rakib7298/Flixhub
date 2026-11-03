import { NextResponse } from "next/server";

export function publicJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Accept", "Cache-Control": status === 200 ? "public, s-maxage=300, stale-while-revalidate=900" : "no-store", Vary: "Accept" } });
}
export function publicOptions() { return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Accept" } }); }
export function publicError(error: unknown) { const message = error && typeof error === "object" && "code" in error && error.code === "TMDB_NOT_CONFIGURED" ? "Connect TMDB on the MediaMatrix application to enable discovery." : "Media discovery is temporarily unavailable."; return publicJson({ error: { code: "DISCOVERY_UNAVAILABLE", message } }, 503); }
