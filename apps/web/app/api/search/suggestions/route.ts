import { NextRequest, NextResponse } from "next/server";
import { getTmdbClient } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "search", { limit: 45, windowMs: 60_000 });
  if (limited) return limited;
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  const client = getTmdbClient();
  if (!client) return NextResponse.json({ error: { code: "NOT_CONFIGURED", message: "Catalog search is not configured." } }, { status: 503 });
  try {
    const result = await client.multiSearch(query);
    return NextResponse.json({ results: result.results.slice(0, 8) }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "Search suggestions are temporarily unavailable." } }, { status: 503 });
  }
}
