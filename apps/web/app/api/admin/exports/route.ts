import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, requireAdmin } from "@/lib/api";
import { assertExportsEnabled } from "@/lib/exports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try { await requireAdmin(); assertExportsEnabled(); const { readExportManifest } = await import("@mediamatrix/cms-editions"); return NextResponse.json({ manifest: await readExportManifest() }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return handleApiError(error, request); } }
export async function POST(request: NextRequest) { try { assertSameOrigin(request); const admin = await requireAdmin(); assertExportsEnabled(); const { createDistributionExports } = await import("@mediamatrix/cms-editions"); const manifest = await createDistributionExports(); await db.auditLog.create({ data: { actorId: admin.id, action: "exports.generated", entity: "ExportManifest", entityId: manifest.commit, metadata: { artifacts: manifest.artifacts.length, commit: manifest.commit } } }); return NextResponse.json({ manifest }, { status: 201 }); } catch (error) { return handleApiError(error, request); } }
