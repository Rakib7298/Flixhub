import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin-header";
import { JellyfinPanel } from "@/components/jellyfin-panel";

export const metadata: Metadata = { title: "Media server" };
export default function AdminMediaServerPage() { return <><AdminHeader eyebrow="Optional adapter" title="Jellyfin media server" description="Browse and play media available to the specifically configured authorized Jellyfin user. Plex support is not implemented in this release." /><JellyfinPanel /></>; }
