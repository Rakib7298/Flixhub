import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { handleApiError, requireAdmin } from "@/lib/api";
import { assertExportsEnabled } from "@/lib/exports";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  try { await requireAdmin(); assertExportsEnabled(); const { name } = await params; const { resolveExportArtifact } = await import("@mediamatrix/cms-editions"); const result = await resolveExportArtifact(name); if (!result) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Export artifact not found." } }, { status: 404 }); const bytes = await readFile(result.file); return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": result.item.contentType, "Content-Length": String(bytes.length), "Content-Disposition": `attachment; filename="${result.item.name}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } }); } catch (error) { return handleApiError(error); }
}
