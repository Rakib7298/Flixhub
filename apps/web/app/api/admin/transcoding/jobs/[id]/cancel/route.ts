import { NextRequest, NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, requireAdmin } from "@/lib/api";
import { transcoderRequest } from "@/lib/transcoder";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const admin = await requireAdmin(); const { id } = await params; if (!/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid job ID." } }, { status: 400 }); const result = await transcoderRequest<{ job: { status: string } }>(`/api/jobs/${id}/cancel`, { method: "POST", body: JSON.stringify({}) }); await db.transcodingJob.updateMany({ where: { workerJobId: id }, data: { status: "CANCELLED" } }); await db.auditLog.create({ data: { actorId: admin.id, action: "transcoding.cancelled", entity: "TranscodingJob", entityId: id, metadata: {} } }); return NextResponse.json(result); } catch (error) { return handleApiError(error); }
}
