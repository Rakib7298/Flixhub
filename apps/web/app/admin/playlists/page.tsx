import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin-header";
import { PlaylistManager } from "@/components/playlist-manager";

export const metadata: Metadata = { title: "Playlist administration" };
export default function AdminPlaylistsPage() { return <><AdminHeader eyebrow="Live TV operations" title="Playlists & GitHub" description="Manage administrator-owned sources, public visibility, GitHub synchronization, refresh schedules, and sanitized logs." /><PlaylistManager /></>; }
