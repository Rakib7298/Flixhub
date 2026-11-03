import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import EmbeddedPostgres from "embedded-postgres";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@mediamatrix/database";
import { authorizeCredentials } from "@/lib/credentials";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as getWatchlist, POST as postWatchlist } from "@/app/api/user/watchlist/route";
import { GET as getFavorites, POST as postFavorite } from "@/app/api/user/favorites/route";
import { PATCH as patchProfile } from "@/app/api/user/profile/route";
import { GET as getPreferences, PATCH as patchPreferences } from "@/app/api/user/preferences/route";
import { GET as getHistory, POST as postHistory, DELETE as deleteHistory } from "@/app/api/user/history/route";
import { GET as getProgress, POST as postProgress } from "@/app/api/user/progress/route";
import { GET as getAdminMediaSources } from "@/app/api/admin/media-sources/route";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, "../..");
const migrationRoot = path.join(repositoryRoot, "packages/database/prisma/migrations");
const migrationStrategy = process.env.MEDIAMATRIX_TEST_MIGRATION === "prisma" ? "prisma" : "sql";
const seededAdmin = { email: "phase2-admin@example.test", username: "phase2_admin", password: `Seed-${randomUUID()}-Aa9` };
const authState = vi.hoisted(() => ({
  session: null as null | { user: { id: string; sessionVersion: number } },
}));

vi.mock("@/auth", () => ({ auth: async () => authState.session }));

let cluster: EmbeddedPostgres;
let databaseDir = "";
let started = false;
let serverVersion = "";
let migrationCount = 0;
const originalEnvironment = new Map<string, string | undefined>();

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a PostgreSQL test port.");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function rememberEnvironment(...names: string[]) {
  for (const name of names) {
    if (!originalEnvironment.has(name)) originalEnvironment.set(name, process.env[name]);
  }
}

function restoreEnvironment() {
  for (const [name, value] of originalEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

async function applyMigrationSql(): Promise<void> {
  const entries = await readdir(migrationRoot, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  migrationCount = directories.length;
  expect(migrationCount).toBeGreaterThan(0);

  const client = cluster.getPgClient();
  await client.connect();
  try {
    for (const directory of directories) {
      const sql = await readFile(path.join(migrationRoot, directory, "migration.sql"), "utf8");
      await client.query(sql);
    }
  } finally {
    await client.end();
  }

}

async function applyMigrationsWithPrisma(databaseUrl: string): Promise<void> {
  const entries = await readdir(migrationRoot, { withFileTypes: true });
  migrationCount = entries.filter((entry) => entry.isDirectory()).length;
  const environment = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl };
  delete environment.PRISMA_SCHEMA_ENGINE_BINARY;
  delete environment.PRISMA_MIGRATION_ENGINE_BINARY;

  try {
    await execFileAsync("pnpm", ["db:deploy"], {
      cwd: repositoryRoot,
      env: environment,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Prisma migrate deploy failed: ${message.replaceAll(databaseUrl, "<redacted-database-url>")}`);
  }
}

async function seedDatabase(databaseUrl: string): Promise<void> {
  try {
    await execFileAsync("pnpm", ["db:seed"], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DIRECT_URL: databaseUrl,
        ADMIN_EMAIL: seededAdmin.email,
        ADMIN_USERNAME: seededAdmin.username,
        ADMIN_PASSWORD: seededAdmin.password,
      },
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Isolated database seed failed: ${message.replaceAll(databaseUrl, "<redacted-database-url>").replaceAll(seededAdmin.password, "<redacted-seed-password>")}`);
  }
}

function request(pathname: string, body?: unknown, rawBody?: string, method?: "GET" | "POST" | "PATCH" | "DELETE"): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, {
    method: method ?? (body === undefined && rawBody === undefined ? "GET" : "POST"),
    headers: {
      ...(body !== undefined || rawBody !== undefined ? { "content-type": "application/json", origin: "http://localhost" } : {}),
      "sec-fetch-site": "same-origin",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(rawBody !== undefined ? { body: rawBody } : {}),
  });
}

async function registerAccount(email: string, username: string, password = "correct-horse-42") {
  const response = await register(request("/api/auth/register", { email, username, password, name: "Phase Two Tester" }));
  const payload = await response.json() as { user?: { id: string; email: string }; error?: { code: string } };
  expect(response.status).toBe(201);
  expect(payload.user?.id).toBeTruthy();
  return payload.user!;
}

beforeAll(async () => {
  rememberEnvironment("DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "TMDB_API_KEY", "TMDB_ACCESS_TOKEN");
  delete process.env.TMDB_API_KEY;
  delete process.env.TMDB_ACCESS_TOKEN;
  process.env.AUTH_SECRET = "phase-two-local-test-secret-not-for-deployment";

  databaseDir = await mkdtemp(path.join(tmpdir(), "mediamatrix-phase2-pg-"));
  const password = randomUUID();
  const port = await availablePort();
  const databaseUrl = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;

  cluster = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password,
    port,
    persistent: false,
    autoRehydrateSymlinks: true,
    onLog: () => {},
  });
  await cluster.initialise();
  await cluster.start();
  started = true;

  const client = cluster.getPgClient();
  await client.connect();
  try {
    const result = await client.query<{ server_version: string }>("SHOW server_version");
    serverVersion = result.rows[0]?.server_version ?? "";
  } finally {
    await client.end();
  }

  if (migrationStrategy === "prisma") await applyMigrationsWithPrisma(databaseUrl);
  else await applyMigrationSql();
  await seedDatabase(databaseUrl);
  console.info(`[database acceptance] PostgreSQL ${serverVersion}; migration strategy: ${migrationStrategy}; migrations: ${migrationCount}`);
}, 120_000);

beforeEach(() => {
  authState.session = null;
  resetRateLimitsForTests();
});

afterAll(async () => {
  authState.session = null;
  try {
    await db.$disconnect();
  } finally {
    if (started) await cluster.stop();
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true });
    restoreEnvironment();
  }
}, 30_000);

describe("isolated PostgreSQL migration and auth acceptance", () => {
  it("creates the schema, enums, and migration records on PostgreSQL 17", async () => {
    expect(serverVersion).toMatch(/^17\./);
    const tables = await db.$queryRaw<Array<{ tableName: string }>>`
      SELECT table_name AS "tableName" FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    const tableNames = tables.map((table) => table.tableName);
    for (const required of ["Role", "User", "UserPreference", "Watchlist", "Favorite", "WatchHistory", "PlaybackProgress", "AuditLog"]) {
      expect(tableNames).toContain(required);
    }
    expect(tableNames.filter((name) => name !== "_prisma_migrations")).toHaveLength(28);

    const enums = await db.$queryRaw<Array<{ enumName: string }>>`
      SELECT t.typname AS "enumName" FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `;
    expect(enums).toHaveLength(7);

    if (migrationStrategy === "prisma") {
      const migrations = await db.$queryRaw<Array<{ name: string; finishedAt: Date | null; rolledBackAt: Date | null }>>`
        SELECT migration_name AS name, finished_at AS "finishedAt", rolled_back_at AS "rolledBackAt"
        FROM _prisma_migrations ORDER BY started_at
      `;
      expect(migrations).toHaveLength(migrationCount);
      expect(migrations.every((migration) => migration.finishedAt && !migration.rolledBackAt)).toBe(true);
    }
  });

  it("registers securely and accepts only valid, active credentials", async () => {
    const created = await registerAccount("Owner@Example.Test", "owner_phase2");
    expect(created.email).toBe("owner@example.test");

    const stored = await db.user.findUniqueOrThrow({ where: { id: created.id }, include: { preference: true } });
    expect(stored.passwordHash).not.toBe("correct-horse-42");
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.preference).not.toBeNull();
    expect(await db.auditLog.count({ where: { actorId: created.id, action: "account.registered" } })).toBe(1);

    await expect(authorizeCredentials({ email: "OWNER@example.test", password: "correct-horse-42" })).resolves.toMatchObject({ id: created.id, role: "USER" });
    await expect(authorizeCredentials({ email: created.email, password: "wrong-password" })).resolves.toBeNull();
    await expect(authorizeCredentials({ email: "missing@example.test", password: "correct-horse-42" })).resolves.toBeNull();
    await expect(authorizeCredentials({ email: "not-an-email", password: "x" })).resolves.toBeNull();

    await db.user.update({ where: { id: created.id }, data: { deletedAt: new Date() } });
    await expect(authorizeCredentials({ email: created.email, password: "correct-horse-42" })).resolves.toBeNull();
  });

  it("returns a conflict for duplicate accounts and validates malformed requests", async () => {
    await registerAccount("duplicate@example.test", "duplicate_one");
    const duplicate = await register(request("/api/auth/register", {
      email: "duplicate@example.test", username: "duplicate_two", password: "correct-horse-42",
    }));
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.code).toBe("CONFLICT");

    const malformed = await register(request("/api/auth/register", undefined, "{"));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("INVALID_JSON");
  });
});

describe("database-backed account, RBAC, and session acceptance", () => {
  it("seeds canonical roles/genres and enforces administrator RBAC", async () => {
    const admin = await db.user.findUniqueOrThrow({ where: { email: seededAdmin.email }, include: { role: true } });
    expect(admin.role.name).toBe("ADMIN");
    expect(admin.passwordHash).not.toBe(seededAdmin.password);
    expect(await db.genre.count()).toBe(35);
    await expect(authorizeCredentials({ email: seededAdmin.email, password: seededAdmin.password })).resolves.toMatchObject({ id: admin.id, role: "ADMIN" });

    const user = await registerAccount("regular-rbac@example.test", "regular_rbac");
    authState.session = { user: { id: user.id, sessionVersion: 0 } };
    const forbidden = await getAdminMediaSources(request("/api/admin/media-sources"));
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe("FORBIDDEN");

    authState.session = { user: { id: admin.id, sessionVersion: 0 } };
    const allowed = await getAdminMediaSources(request("/api/admin/media-sources"));
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).items).toEqual([]);
  });

  it("persists profile/preferences and rejects a stale session version", async () => {
    const user = await registerAccount("profile-phase2@example.test", "profile_phase2");
    authState.session = { user: { id: user.id, sessionVersion: 0 } };

    const profile = await patchProfile(request("/api/user/profile", { name: "Updated Phase Two Name" }, undefined, "PATCH"));
    expect(profile.status).toBe(200);
    expect((await profile.json()).user.name).toBe("Updated Phase Two Name");

    const defaults = await getPreferences(request("/api/user/preferences"));
    expect((await defaults.json()).preference).toMatchObject({ country: "BD", language: "en", autoplay: false });
    const updated = await patchPreferences(request("/api/user/preferences", {
      country: "us", language: "en-US", autoplay: true, dataSaver: true, reducedMotion: true,
    }, undefined, "PATCH"));
    expect(updated.status).toBe(200);
    expect((await updated.json()).preference).toMatchObject({ country: "US", language: "en-us", autoplay: true, dataSaver: true, reducedMotion: true });

    await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    const stale = await getPreferences(request("/api/user/preferences"));
    expect(stale.status).toBe(401);
    expect((await stale.json()).error.code).toBe("SESSION_INVALID");

    authState.session = { user: { id: user.id, sessionVersion: 1 } };
    const refreshed = await getPreferences(request("/api/user/preferences"));
    expect(refreshed.status).toBe(200);
  });
});

describe("database-backed history and progress acceptance", () => {
  it("persists resume state, deduplicates recent history, and records clearing", async () => {
    const user = await registerAccount("history-phase2@example.test", "history_phase2");
    authState.session = { user: { id: user.id, sessionVersion: 0 } };
    const progressInput = { mediaKey: "movie:238", title: "The Godfather", posterPath: "/poster.jpg" };

    const started = await postProgress(request("/api/user/progress", { ...progressInput, seconds: 30, duration: 100 }));
    expect(started.status).toBe(200);
    expect((await started.json()).item.seconds).toBe(30);
    expect(await db.watchHistory.count({ where: { userId: user.id } })).toBe(0);

    const nearlyComplete = await postProgress(request("/api/user/progress", { ...progressInput, seconds: 95, duration: 100 }));
    expect(nearlyComplete.status).toBe(200);
    expect((await nearlyComplete.json()).item.seconds).toBe(95);
    expect(await db.watchHistory.count({ where: { userId: user.id } })).toBe(1);

    const resume = await getProgress(request("/api/user/progress"));
    expect((await resume.json()).items).toHaveLength(1);
    const duplicateHistory = await postHistory(request("/api/user/history", progressInput));
    expect(duplicateHistory.status).toBe(200);
    expect(await db.watchHistory.count({ where: { userId: user.id } })).toBe(1);
    expect((await (await getHistory(request("/api/user/history"))).json()).items).toHaveLength(1);

    const cleared = await deleteHistory(request("/api/user/history", undefined, undefined, "DELETE"));
    expect(cleared.status).toBe(204);
    expect(await db.watchHistory.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { actorId: user.id, action: "history.cleared" } })).toBe(1);
  });
});

describe("database-backed library API acceptance", () => {
  it("persists watchlist/favorites and prevents cross-user reads or removal", async () => {
    const owner = await registerAccount("library-owner@example.test", "library_owner");
    const other = await registerAccount("library-other@example.test", "library_other");

    await expect((await getWatchlist(request("/api/user/watchlist"))).status).toBe(401);

    authState.session = { user: { id: owner.id, sessionVersion: 0 } };
    const added = await postWatchlist(request("/api/user/watchlist", {
      action: "add", mediaType: "movie", tmdbId: 238, title: "The Godfather", posterPath: "/poster.jpg",
    }));
    expect(added.status).toBe(201);
    expect((await added.json()).saved).toBe(true);

    const updated = await postWatchlist(request("/api/user/watchlist", {
      action: "add", mediaType: "movie", tmdbId: 238, title: "The Godfather (restored)", posterPath: "/restored.jpg",
    }));
    expect(updated.status).toBe(201);
    expect(await db.watchlist.count({ where: { userId: owner.id, mediaKey: "movie:238" } })).toBe(1);

    const favorite = await postFavorite(request("/api/user/favorites", {
      action: "add", mediaType: "tv", tmdbId: 1399, title: "Game of Thrones",
    }));
    expect(favorite.status).toBe(201);

    authState.session = { user: { id: other.id, sessionVersion: 0 } };
    const otherItems = await getWatchlist(request("/api/user/watchlist"));
    expect(otherItems.status).toBe(200);
    expect((await otherItems.json()).items).toEqual([]);
    const crossUserRemoval = await postWatchlist(request("/api/user/watchlist", {
      action: "remove", mediaType: "movie", tmdbId: 238,
    }));
    expect(crossUserRemoval.status).toBe(200);
    expect(await db.watchlist.count({ where: { userId: owner.id, mediaKey: "movie:238" } })).toBe(1);

    authState.session = { user: { id: owner.id, sessionVersion: 0 } };
    const ownerItems = await getWatchlist(request("/api/user/watchlist"));
    const ownerPayload = await ownerItems.json();
    expect(ownerPayload.items).toHaveLength(1);
    expect(ownerPayload.items[0]).toMatchObject({ title: "The Godfather (restored)", posterPath: "/restored.jpg" });
    expect(ownerItems.headers.get("cache-control")).toBe("no-store");

    const favorites = await getFavorites(request("/api/user/favorites"));
    expect((await favorites.json()).items).toHaveLength(1);
    expect(await db.favorite.count({ where: { userId: other.id } })).toBe(0);

    const invalid = await postWatchlist(request("/api/user/watchlist", {
      action: "add", mediaType: "movie", tmdbId: 240,
    }));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("METADATA_REQUIRED");
  });
});
