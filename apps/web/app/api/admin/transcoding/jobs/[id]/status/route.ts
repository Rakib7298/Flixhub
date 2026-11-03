import { NextResponse } from "next/server";
import { db } from "@mediamatrix/database";
import { handleApiError, requireAdmin } from "@/lib/api";
import { transcoderRequest } from "@/lib/transcoder";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const { id } = await params; if (!/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid job ID." } }, { status: 400 }); const result = await transcoderRequest<{ job: { status: string; progress: number; error?: string } }>(`/api/jobs/${id}/status`); await db.transcodingJob.updateMany({ where: { workerJobId: id }, data: { status: result.job.status as "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED", progress: result.job.progress, errorMessage: result.job.error?.slice(0, 500) } }); return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return handleApiError(error); }
}
