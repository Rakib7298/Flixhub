"use client";

import { useSession } from "next-auth/react";
import { ContinueWatching } from "./continue-watching";
import { WatchlistPreview } from "./watchlist-preview";

export function PersonalizedRows() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return <><ContinueWatching /><WatchlistPreview /></>;
}
