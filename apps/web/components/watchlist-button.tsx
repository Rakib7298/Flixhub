"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bookmark, Check } from "lucide-react";
import type { MediaType } from "@mediamatrix/shared";
import { apiRequest } from "@mediamatrix/api-client";
import { Button } from "@mediamatrix/ui";

export function WatchlistButton({ mediaType, tmdbId, title, posterPath, initialSaved = false, onSavedChange }: { mediaType: MediaType; tmdbId: number; title: string; posterPath: string | null; initialSaved?: boolean; onSavedChange?: (saved: boolean) => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session?.user) return;
    apiRequest<{ items: Array<{ mediaKey: string }> }>("/api/user/watchlist").then((data) => setSaved(data.items.some((item) => item.mediaKey === `${mediaType}:${tmdbId}`))).catch(() => setError("Watchlist status is unavailable."));
  }, [session?.user, mediaType, tmdbId]);
  async function toggle() {
    if (!session?.user) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return; }
    setLoading(true); setError("");
    try {
      const result = await apiRequest<{ saved: boolean }>("/api/user/watchlist", { method: "POST", body: JSON.stringify({ action: saved ? "remove" : "add", mediaType, tmdbId, title, posterPath }) });
      setSaved(result.saved); onSavedChange?.(result.saved); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Watchlist could not be updated."); } finally { setLoading(false); }
  }
  return <div><Button type="button" variant="secondary" onClick={toggle} loading={loading}>{saved ? <Check size={17} /> : <Bookmark size={17} />}{saved ? "In your list" : "Add to list"}</Button>{error && <p role="alert" className="mt-2 max-w-xs text-xs text-red-300">{error}</p>}</div>;
}
