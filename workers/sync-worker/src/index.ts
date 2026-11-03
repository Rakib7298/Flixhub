import { db } from "@mediamatrix/database";
import { TmdbClient, persistMovieMetadata, persistTvMetadata } from "@mediamatrix/tmdb";

const intervalMs = 6 * 60 * 60_000;
let running = false;

async function run() {
  if (running) return;
  running = true;
  try {
    if (!process.env.TMDB_ACCESS_TOKEN && !process.env.TMDB_API_KEY) throw new Error("TMDB credentials are required for the sync worker.");
    const client = new TmdbClient({ accessToken: process.env.TMDB_ACCESS_TOKEN, apiKey: process.env.TMDB_API_KEY, baseUrl: process.env.TMDB_API_BASE_URL });
    const targets = (process.env.TMDB_SYNC_IDS || "").split(",").map((value) => value.trim()).filter(Boolean);
    for (const target of targets) {
      const match = /^(movie|tv):(\d{1,10})$/.exec(target);
      if (!match) { console.warn("Skipping an invalid TMDB_SYNC_IDS entry format."); continue; }
      const type = match[1] as "movie" | "tv"; const id = Number(match[2]);
      const job = await db.backgroundJob.create({ data: { type: "tmdb.scheduled_sync", payload: { mediaType: type, tmdbId: id }, status: "RUNNING", attempts: 1, lockedAt: new Date() } });
      try {
        if (type === "movie") await persistMovieMetadata(await client.movie(id)); else await persistTvMetadata(await client.tv(id));
        await db.backgroundJob.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
      } catch {
        await db.backgroundJob.update({ where: { id: job.id }, data: { status: "FAILED", lastError: "Scheduled metadata synchronization failed" } });
      }
    }
    console.log(`TMDB sync cycle finished for ${targets.length} configured target(s).`);
  } catch (error) { console.error(error instanceof Error ? error.message : "TMDB sync worker failed"); }
  finally { running = false; }
}

void run();
const timer = setInterval(run, intervalMs);
function shutdown() { clearInterval(timer); process.exit(0); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
