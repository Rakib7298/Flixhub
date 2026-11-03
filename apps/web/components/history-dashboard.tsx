"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, GlassCard } from "@mediamatrix/ui";
import { apiRequest } from "@mediamatrix/api-client";
import { ContinueWatching } from "./continue-watching";

interface HistoryItem { id: string; mediaKey: string; title: string; watchedAt: string }

export function HistoryDashboard() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => { apiRequest<{ items: HistoryItem[] }>("/api/user/history").then((data) => setItems(data.items)).catch((caught) => setError(caught instanceof Error ? caught.message : "History unavailable")).finally(() => setLoading(false)); }, []);
  async function clear() { if (!window.confirm("Clear all watch history? This cannot be undone.")) return; try { await apiRequest("/api/user/history", { method: "DELETE" }); setItems([]); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not clear history"); } }
  return <><ContinueWatching />{error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}{loading ? <GlassCard className="h-40 animate-pulse" /> : items.length ? <><div className="mb-4 flex justify-end"><Button variant="ghost" size="sm" onClick={clear}>Clear watch history</Button></div><div className="space-y-2">{items.map((item) => <GlassCard key={item.id} className="flex items-center justify-between gap-4 p-4"><div><h2 className="text-sm font-semibold">{item.title}</h2><p className="mt-1 text-[11px] text-zinc-500">{item.mediaKey} · {new Date(item.watchedAt).toLocaleString()}</p></div></GlassCard>)}</div></> : <EmptyState title="No completed viewing history" description="Authorized playback that reaches the completion threshold will be recorded here. Progress is available separately under Continue Watching." />}</>;
}
