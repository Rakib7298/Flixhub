import { NextResponse } from "next/server";
import { logEvent, requestLogFields, withRequestId } from "@/lib/observability";

export function publicJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Accept", "Cache-Control": status === 200 ? "public, s-maxage=300, stale-while-revalidate=900" : "no-store", Vary: "Accept" } });
}
export function publicOptions() { return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Accept" } }); }
export function publicError(error: unknown, request: Request) {
  const notConfigured = error && typeof error === "object" && "code" in error && error.code === "TMDB_NOT_CONFIGURED";
  const fields = requestLogFields(request);
  logEvent("warn", "discovery.unavailable", { ...fields, status: 503, code: notConfigured ? "TMDB_NOT_CONFIGURED" : "DISCOVERY_UNAVAILABLE" });
  const message = notConfigured ? "Connect TMDB on the MediaMatrix application to enable discovery." : "Media discovery is temporarily unavailable.";
  return withRequestId(publicJson({ error: { code: "DISCOVERY_UNAVAILABLE", message } }, 503), request, fields.requestId);
}
