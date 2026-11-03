"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Clapperboard, Database, Download, FileClock, HardDrive, LayoutDashboard, ListVideo, Settings, Users, Video } from "lucide-react";
import { cn } from "@mediamatrix/ui";

const links = [
  ["/admin", "Overview", LayoutDashboard], ["/admin/media", "Media & sources", Clapperboard], ["/admin/playlists", "Playlists & GitHub", ListVideo], ["/admin/media-server", "Media server", HardDrive], ["/admin/transcoding", "Transcoding", Video], ["/admin/users", "Users & roles", Users], ["/admin/jobs", "Jobs & logs", FileClock], ["/admin/settings", "Health & settings", Activity], ["/admin/exports", "Export manager", Download],
] as const;
export function AdminNav() { const pathname = usePathname(); return <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible" aria-label="Administration">{links.map(([href, label, Icon]) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition", active ? "bg-red-500/12 text-red-200" : "text-zinc-500 hover:bg-white/[.05] hover:text-white")}><Icon size={16} />{label}</Link>; })}<Link href="/" className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs text-zinc-600 hover:text-white"><Database size={16} />Back to application</Link><Link href="/admin/settings" className="hidden"><Settings /></Link></nav>; }
