import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { auth } from "@/auth";
import { db } from "@mediamatrix/database";
import type { RoleName } from "@mediamatrix/database";
import { logEvent, requestLogFields, withRequestId } from "@/lib/observability";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: RoleName;
  sessionVersion: number;
}

export async function requireUser(): Promise<AuthenticatedUser> {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) throw new ApiError(503, "AUTH_NOT_CONFIGURED", "Authentication requires DATABASE_URL and AUTH_SECRET.");
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const user = await db.user.findUnique({ where: { id: session.user.id }, include: { role: true } });
  if (!user || user.deletedAt || user.sessionVersion !== session.user.sessionVersion) throw new ApiError(401, "SESSION_INVALID", "Your session is no longer valid. Sign in again.");
  return { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role.name, sessionVersion: user.sessionVersion };
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Administrator permission is required.");
  return user;
}

export function assertSameOrigin(request: NextRequest): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new ApiError(403, "CSRF_REJECTED", "Cross-site requests are not allowed.");
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
  const requestOrigin = new URL(origin);
  if (origin !== request.nextUrl.origin && requestOrigin.origin !== expected.origin) throw new ApiError(403, "CSRF_REJECTED", "Request origin does not match this application.");
}

export async function readBodyBytes(request: NextRequest, maxBytes: number): Promise<Buffer> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break; if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>, maxBytes = 16_384): Promise<T> {
  const bytes = await readBodyBytes(request, maxBytes);
  let body: unknown;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new ApiError(400, "INVALID_JSON", "A valid JSON request body is required."); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "The submitted data is invalid.", parsed.error.flatten());
  return parsed.data;
}

export function handleApiError(error: unknown, request: Request): NextResponse {
  const fields = requestLogFields(request);
  const respond = (body: unknown, status: number) => withRequestId(NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  }), request, fields.requestId);

  if (error instanceof ApiError) {
    return respond({ error: { code: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) } }, error.status);
  }
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    return respond({ error: { code: "CONFLICT", message: "This record already exists." } }, 409);
  }
  if (error instanceof Error && /required|not configured/i.test(error.message)) {
    return respond({ error: { code: "NOT_CONFIGURED", message: error.message } }, 503);
  }
  logEvent("error", "request.unhandled_error", {
    ...fields,
    status: 500,
    code: "INTERNAL_ERROR",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return respond({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, 500);
}

export function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
