import { NextResponse } from "next/server";
import { integrationStatus, readServerEnv } from "@mediamatrix/config";
import { db } from "@mediamatrix/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = readServerEnv();
  const integrations = integrationStatus(env);
  let databaseReachable: boolean | null = null;
  if (integrations.database) {
    try { await db.$queryRaw`SELECT 1`; databaseReachable = true; } catch { databaseReachable = false; }
  }
  const ready = databaseReachable === true && integrations.authentication;
  return NextResponse.json({
    status: ready ? "ok" : "degraded",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    checks: { ...integrations, databaseReachable },
    note: "Integration flags indicate configuration, not third-party service verification. Detailed operational logs require an administrator.",
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
