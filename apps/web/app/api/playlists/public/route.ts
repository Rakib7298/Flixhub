import { NextResponse } from "next/server";
import { db } from "@mediamatrix/database";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const items = await db.playlist.findMany({ where: { isPublic: true, enabled: true, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, lastSyncAt: true, _count: { select: { items: { where: { isActive: true } } } } }, take: 100 });
    return NextResponse.json({ items: items.map(({ _count, ...item }) => ({ ...item, itemCount: _count.items, isOwner: false })) }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch { return NextResponse.json({ error: { code: "UNAVAILABLE", message: "Public playlists are unavailable." } }, { status: 503 }); }
}
