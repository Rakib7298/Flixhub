"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@mediamatrix/api-client";
import { Button, GlassCard } from "@mediamatrix/ui";
import { RefreshCw } from "lucide-react";

export function TmdbSyncPanel() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(""); setMessage(""); try { const result = await apiRequest<{ status: string; synchronizedAt: string }>("/api/admin/sync/tmdb", { method: "POST", body: JSON.stringify({ mediaType: form.get("mediaType"), tmdbId: Number(form.get("tmdbId")) }) }); setMessage(`Metadata synchronized at ${new Date(result.synchronizedAt).toLocaleString()}.`); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Synchronization failed"); } finally { setBusy(false); } }
  return <GlassCard className="p-5"><h2 className="text-lg font-bold">Manual TMDB synchronization</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Fetch current metadata from TMDB and upsert it into PostgreSQL. Credentials remain server-side.</p><form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[150px_1fr_auto]"><select name="mediaType" className="field" aria-label="Media type"><option value="movie">Movie</option><option value="tv">TV series</option></select><input name="tmdbId" type="number" min="1" className="field" required placeholder="TMDB ID" aria-label="TMDB ID" /><Button type="submit" loading={busy}><RefreshCw size={15} />Sync now</Button></form>{message && <p role="status" className="mt-3 text-xs text-green-300">{message}</p>}{error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}</GlassCard>;
}
