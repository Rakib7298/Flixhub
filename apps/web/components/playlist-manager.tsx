"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiRequest } from "@mediamatrix/api-client";
import { Badge, Button, EmptyState, GlassCard } from "@mediamatrix/ui";
import { FileUp, Github, Globe2, Link2, Plus, RefreshCw, Trash2 } from "lucide-react";

interface Playlist { id: string; name: string; sourceType: "URL" | "UPLOAD" | "GITHUB"; isPublic: boolean; isOwner: boolean; enabled: boolean; status: string; refreshMinutes: number; lastSyncAt: string | null; lastError: string | null; itemCount: number; githubRepository?: string | null; githubBranch?: string | null; githubFilePath?: string | null }
interface SyncLog { id: string; status: string; message: string; itemCount: number; startedAt: string; finishedAt: string | null }

export function PlaylistManager() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Playlist[]>([]);
  const [tab, setTab] = useState<"URL" | "UPLOAD" | "GITHUB">("URL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<Record<string, SyncLog[]>>({});
  const isAdmin = session?.user?.role === "ADMIN";
  const refresh = useCallback(async () => {
    try { const data = await apiRequest<{ items: Playlist[] }>("/api/playlists"); setItems(data.items.filter((item) => item.isOwner)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load playlists"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setBusy("create"); setError(""); setMessage("");
    try {
      let body: BodyInit; const headers: Record<string, string> = {};
      if (tab === "UPLOAD") body = form;
      else {
        const common = { name: form.get("name"), isPublic: form.get("isPublic") === "on", refreshMinutes: Number(form.get("refreshMinutes")), allowPrivateNetwork: form.get("allowPrivateNetwork") === "on" };
        body = JSON.stringify(tab === "URL" ? { ...common, sourceType: "URL", url: form.get("url") } : { ...common, sourceType: "GITHUB", repository: form.get("repository"), branch: form.get("branch"), path: form.get("path") }); headers["Content-Type"] = "application/json";
      }
      const result = await apiRequest<{ playlist: { name: string; itemCount: number }; duplicateCount: number; issues: Array<{ message: string }> }>("/api/playlists", { method: "POST", body, headers });
      setMessage(`${result.playlist.name} imported: ${result.playlist.itemCount} valid channels, ${result.duplicateCount} duplicates skipped.${result.issues.length ? ` ${result.issues.length} parser warnings were recorded.` : ""}`);
      formElement.reset(); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Playlist import failed"); }
    finally { setBusy(""); }
  }

  async function update(item: Playlist, data: object) { setBusy(item.id); setError(""); try { await apiRequest(`/api/playlists/${item.id}`, { method: "PATCH", body: JSON.stringify(data) }); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Update failed"); } finally { setBusy(""); } }
  async function synchronize(item: Playlist) { setBusy(item.id); setError(""); setMessage(""); try { const result = await apiRequest<{ itemCount: number }>(`/api/playlists/${item.id}/refresh`, { method: "POST", body: JSON.stringify({}) }); setMessage(`${item.name} synchronized: ${result.itemCount} channels.`); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Synchronization failed"); await refresh(); } finally { setBusy(""); } }
  async function remove(item: Playlist) { if (!window.confirm(`Delete “${item.name}” and its channel list? Playback favorites linked to it will also be removed.`)) return; setBusy(item.id); try { await apiRequest(`/api/playlists/${item.id}`, { method: "DELETE" }); setMessage(`${item.name} deleted.`); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Delete failed"); } finally { setBusy(""); } }
  async function toggleLogs(item: Playlist) { if (logs[item.id]) { setLogs((current) => { const next = { ...current }; delete next[item.id]; return next; }); return; } try { const result = await apiRequest<{ items: SyncLog[] }>(`/api/playlists/${item.id}/logs`); setLogs((current) => ({ ...current, [item.id]: result.items })); } catch (caught) { setError(caught instanceof Error ? caught.message : "Logs unavailable"); } }

  return <div className="space-y-8">
    <GlassCard className="p-5 sm:p-6"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Add an authorized playlist</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Remote sources are validated and downloaded with SSRF, redirect, size, and time protections.</p></div><div className="flex rounded-full bg-white/[.05] p-1">{([["URL", Link2], ["UPLOAD", FileUp], ...(isAdmin ? [["GITHUB", Github] as const] : [])] as Array<[typeof tab, typeof Link2]>).map(([value, Icon]) => <button key={value} onClick={() => setTab(value)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold ${tab === value ? "bg-white text-black" : "text-zinc-400"}`}><Icon size={13} />{value === "URL" ? "URL" : value === "UPLOAD" ? "Upload" : "GitHub"}</button>)}</div></div><form onSubmit={create} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Playlist name</span><input name="name" className="field" required maxLength={120} placeholder="My authorized channels" /></label>{tab === "URL" && <label><span className="field-label">M3U / M3U8 URL</span><input name="url" type="url" className="field" required maxLength={2048} placeholder="https://example.com/authorized.m3u" /></label>}{tab === "UPLOAD" && <label><span className="field-label">Playlist file</span><input name="file" type="file" className="field py-2.5" required accept=".m3u,.m3u8,application/vnd.apple.mpegurl,application/x-mpegurl,text/plain" /></label>}{tab === "GITHUB" && <label><span className="field-label">Repository</span><input name="repository" className="field" required placeholder="owner/repository" pattern="[^/]+/[^/]+" /></label>}{tab === "GITHUB" && <><label><span className="field-label">Branch</span><input name="branch" className="field" required defaultValue="main" /></label><label><span className="field-label">Playlist file path</span><input name="path" className="field" required placeholder="playlists/channels.m3u" /></label></>}{tab !== "UPLOAD" && <label><span className="field-label">Automatic refresh</span><select name="refreshMinutes" className="field" defaultValue="360"><option value="60">Every hour</option><option value="360">Every 6 hours</option><option value="720">Every 12 hours</option><option value="1440">Daily</option></select></label>}</div><div className="flex flex-wrap gap-5">{isAdmin && <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" name="isPublic" className="h-4 w-4 accent-red-600" />Make public (credential-like stream parameters are rejected)</label>}{isAdmin && tab === "URL" && <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" name="allowPrivateNetwork" className="h-4 w-4 accent-red-600" />Trusted private network source (also requires server opt-in)</label>}</div><Button type="submit" loading={busy === "create"}><Plus size={16} />Validate & import playlist</Button></form></GlassCard>
    {message && <p role="status" className="rounded-xl border border-green-500/15 bg-green-500/[.06] px-4 py-3 text-sm text-green-200">{message}</p>}{error && <p role="alert" className="rounded-xl border border-red-500/15 bg-red-500/[.06] px-4 py-3 text-sm text-red-200">{error}</p>}
    <section><h2 className="section-title mb-4">Your playlists</h2>{loading ? <GlassCard className="h-48 animate-pulse" /> : items.length ? <div className="space-y-3">{items.map((item) => <GlassCard key={item.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[.05] text-zinc-400">{item.sourceType === "GITHUB" ? <Github size={19} /> : item.sourceType === "UPLOAD" ? <FileUp size={19} /> : <Globe2 size={19} />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold">{item.name}</h3><Badge tone={item.status === "ACTIVE" ? "green" : item.status === "ERROR" ? "red" : "neutral"}>{item.status}</Badge>{item.isPublic && <Badge>Public</Badge>}</div><p className="mt-1.5 text-[11px] text-zinc-500">{item.itemCount} channels · {item.sourceType} · {item.lastSyncAt ? `Synced ${new Date(item.lastSyncAt).toLocaleString()}` : "Never synchronized"}</p>{item.lastError && <p className="mt-1 text-[11px] text-red-300">{item.lastError}</p>}</div></div><div className="flex flex-wrap gap-2">{item.sourceType !== "UPLOAD" && <Button size="sm" variant="secondary" loading={busy === item.id} onClick={() => synchronize(item)}><RefreshCw size={13} />Refresh</Button>}<Button size="sm" variant="ghost" onClick={() => update(item, { enabled: !item.enabled })}>{item.enabled ? "Disable" : "Enable"}</Button>{isAdmin && <Button size="sm" variant="ghost" onClick={() => update(item, { isPublic: !item.isPublic })}>{item.isPublic ? "Make private" : "Publish"}</Button>}<Button size="sm" variant="ghost" onClick={() => toggleLogs(item)}>Logs</Button><Button size="sm" variant="ghost" className="text-red-300" onClick={() => remove(item)}><Trash2 size={14} />Delete</Button></div></div>{logs[item.id] && <div className="mt-4 space-y-2 border-t border-white/[.07] pt-4">{logs[item.id]?.length ? logs[item.id]?.map((log) => <div key={log.id} className="rounded-lg bg-black/20 p-3 text-[11px]"><span className={log.status === "SUCCESS" ? "text-green-300" : log.status === "ERROR" ? "text-red-300" : "text-yellow-300"}>{log.status}</span><span className="ml-2 text-zinc-400">{log.message}</span><span className="mt-1 block text-zinc-600">{new Date(log.startedAt).toLocaleString()}</span></div>) : <p className="text-xs text-zinc-500">No synchronization logs.</p>}</div>}</GlassCard>)}</div> : <EmptyState title="No playlists yet" description="Add a playlist URL or upload an authorized M3U/M3U8 file above. MediaMatrix does not supply or assume redistribution rights for channel sources." />}</section>
  </div>;
}
