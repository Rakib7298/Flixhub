import { db } from "@mediamatrix/database";

const intervalMs = 60_000;
let running = false;

async function run() {
  if (running) return;
  running = true;
  try {
    const secret = process.env.SYNC_CRON_SECRET;
    if (!secret) throw new Error("SYNC_CRON_SECRET is required for the playlist worker.");
    const baseUrl = (process.env.WEB_INTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
    const candidates = await db.playlist.findMany({ where: { enabled: true, sourceType: { in: ["URL", "GITHUB"] }, OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date(Date.now() - 15 * 60_000) } }] }, orderBy: { lastSyncAt: "asc" }, take: 25 });
    const now = Date.now();
    const due = candidates.filter((playlist) => !playlist.lastSyncAt || now - playlist.lastSyncAt.getTime() >= playlist.refreshMinutes * 60_000);
    for (const playlist of due) {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 120_000);
      try {
        const response = await fetch(`${baseUrl}/api/internal/playlists/sync`, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ playlistId: playlist.id }), signal: controller.signal });
        if (!response.ok) console.warn(`A scheduled playlist sync returned HTTP ${response.status}.`);
      } catch { console.warn("A scheduled playlist sync could not reach the web application."); }
      finally { clearTimeout(timeout); }
    }
    console.log(`Playlist worker cycle complete: ${due.length} due playlist(s).`);
  } catch (error) { console.error(error instanceof Error ? error.message : "Playlist worker failed"); }
  finally { running = false; }
}

void run();
const timer = setInterval(run, intervalMs);
function shutdown() { clearInterval(timer); process.exit(0); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
