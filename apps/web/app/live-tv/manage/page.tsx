import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { PlaylistManager } from "@/components/playlist-manager";

export const metadata: Metadata = { title: "Playlist management" };
export const dynamic = "force-dynamic";
export default async function ManagePlaylistsPage() { const session = await auth(); if (!session?.user) redirect("/login?callbackUrl=/live-tv/manage"); return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Live TV administration" title="Playlist management" description="Import, validate, organize, publish, and synchronize authorized channel sources." /><PlaylistManager /></div>; }
