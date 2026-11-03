import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@mediamatrix/database";
import { assertSameOrigin, handleApiError, parseBody, requireAdmin } from "@/lib/api";
import { transcoderRequest } from "@/lib/transcoder";
import { encryptSecret } from "@/lib/security";

export const dynamic = "force-dynamic";
export async function GET() { try { await requireAdmin(); const result = await transcoderRequest<{ jobs: unknown[] }>("/api/jobs"); return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return handleApiError(error); } }
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const admin = await requireAdmin();
    const input = await parseBody(request, z.object({ inputUrl: z.string().url().max(2048), authorizationConfirmed: z.literal(true), thumbnail: z.boolean().default(false), preset: z.enum(["veryfast", "faster", "fast"]).default("veryfast"), crf: z.number().int().min(18).max(35).default(23) }).strict(), 32_768);
    const result = await transcoderRequest<{ job: { id: string; status: string } }>("/api/jobs", { method: "POST", body: JSON.stringify(input) });
    await db.transcodingJob.create({ data: { userId: admin.id, workerJobId: result.job.id, inputUrlCiphertext: encryptSecret(input.inputUrl), status: "QUEUED" } });
    await db.auditLog.create({ data: { actorId: admin.id, action: "transcoding.submitted", entity: "TranscodingJob", entityId: result.job.id, metadata: { thumbnail: input.thumbnail } } });
    return NextResponse.json(result, { status: 202 });
  } catch (error) { return handleApiError(error); }
}
