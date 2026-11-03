import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { LiveTvDashboard } from "@/components/live-tv-dashboard";

export const metadata: Metadata = { title: "Live TV", description: "Manage and play authorized live TV playlists." };
export default function LiveTvPage() { return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Your authorized channels" title="Live TV" description="Bring your own M3U/M3U8 playlists, organize channels, and play compatible streams in a secure personal workspace." /><LiveTvDashboard /></div>; }
