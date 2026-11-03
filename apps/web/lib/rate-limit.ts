import { NextRequest, NextResponse } from "next/server";
import { logEvent, requestLogFields, withRequestId } from "@/lib/observability";

interface Bucket { count: number; resetAt: number }
const globalLimiter = globalThis as unknown as { rateLimitBuckets?: Map<string, Bucket> };
const buckets = globalLimiter.rateLimitBuckets ?? new Map<string, Bucket>();
globalLimiter.rateLimitBuckets = buckets;

export function rateLimit(request: NextRequest, scope: string, options: { limit: number; windowMs: number }): NextResponse | null {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.VERCEL === "1" || process.env.NETLIFY === "true";
  const forwarded = trustProxy ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const identity = forwarded || (trustProxy ? request.headers.get("x-real-ip") : null) || "direct";
  const key = `${scope}:${identity}`;
  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + options.windowMs };
  bucket.count++;
  buckets.set(key, bucket);
  if (bucket.count <= options.limit) return null;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const fields = requestLogFields(request);
  logEvent("warn", "rate_limit.exceeded", { ...fields, status: 429, code: "RATE_LIMITED", scope });
  return withRequestId(NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }, { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } }), request, fields.requestId);
}

export function resetRateLimitsForTests() { buckets.clear(); }
