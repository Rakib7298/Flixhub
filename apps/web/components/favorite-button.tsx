"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { apiRequest } from "@mediamatrix/api-client";
import type { MediaType } from "@mediamatrix/shared";
import { Button } from "@mediamatrix/ui";

export function FavoriteButton({ mediaType, tmdbId, title, posterPath, initialSaved = false, onSavedChange }: { mediaType: MediaType; tmdbId: number; title: string; posterPath: string | null; initialSaved?: boolean; onSavedChange?: (saved: boolean) => void }) {
  const { data: session } = useSession(); const router = useRouter(); const [saved, setSaved] = useState(initialSaved); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!session?.user) return; apiRequest<{ items: Array<{ mediaKey: string }> }>("/api/user/favorites").then((data) => setSaved(data.items.some((item) => item.mediaKey === `${mediaType}:${tmdbId}`))).catch(() => undefined); }, [session?.user, mediaType, tmdbId]);
  async function toggle() {
    if (!session?.user) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return; }
    setLoading(true); setError("");
    try { const result = await apiRequest<{ saved: boolean }>("/api/user/favorites", { method: "POST", body: JSON.stringify({ action: saved ? "remove" : "add", mediaType, tmdbId, title, posterPath }) }); setSaved(result.saved); onSavedChange?.(result.saved); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Favorite could not be updated"); } finally { setLoading(false); }
  }
  return <div><Button variant="ghost" onClick={toggle} loading={loading} aria-pressed={saved}><Heart size={17} className={saved ? "fill-red-500 text-red-500" : ""} />{saved ? "Favorited" : "Favorite"}</Button>{error && <p className="mt-1 text-xs text-red-300">{error}</p>}</div>;
}
