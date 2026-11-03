import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Clapperboard, ListVideo, Users, type LucideIcon } from "lucide-react";
import { db } from "@mediamatrix/database";
import { integrationStatus } from "@mediamatrix/config";
import { GlassCard } from "@mediamatrix/ui";
import { AdminHeader } from "@/components/admin-header";

export const metadata: Metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [users, movies, shows, playlists, jobs, failedJobs] = await Promise.all([db.user.count({ where: { deletedAt: null } }), db.movie.count(), db.tvSeries.count(), db.playlist.count(), db.backgroundJob.count(), db.backgroundJob.count({ where: { status: "FAILED" } })]);
  const integrations = integrationStatus();
  const stats: Array<[string, number, LucideIcon, string]> = [["Active users", users, Users, "/admin/users"], ["Movies", movies, Clapperboard, "/admin/media"], ["TV series", shows, Clapperboard, "/admin/media"], ["Playlists", playlists, ListVideo, "/admin/playlists"]];
  return <>
    <AdminHeader eyebrow="MediaMatrix administration" title="System overview" description="Live PostgreSQL counts and server configuration status. No demonstration analytics are used." />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(([label, value, Icon, href]) => <Link href={href} key={label}><GlassCard className="p-4 transition hover:bg-white/[.08] sm:p-5"><Icon size={18} className="mb-4 text-red-400" /><p className="text-2xl font-extrabold sm:text-3xl">{value.toLocaleString()}</p><p className="mt-1 text-xs text-zinc-500">{label}</p></GlassCard></Link>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <GlassCard className="p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><Activity size={18} className="text-red-400" />Integration configuration</h2><div className="mt-5 space-y-3">{Object.entries(integrations).map(([key, configured]) => <div key={key} className="flex items-center justify-between border-b border-white/[.05] pb-3 text-xs last:border-0"><span className="capitalize text-zinc-400">{key.replace(/([A-Z])/g, " $1")}</span><span className={configured ? "text-green-300" : "text-zinc-600"}>{configured ? "Configured" : "Not configured"}</span></div>)}</div><p className="mt-4 text-[10px] leading-5 text-zinc-600">Configuration flags do not prove third-party connectivity. Public health excludes sensitive values.</p></GlassCard>
      <GlassCard className="p-5"><h2 className="text-lg font-bold">Background work</h2><p className="mt-5 text-4xl font-black">{jobs}</p><p className="mt-1 text-xs text-zinc-500">Recorded background jobs</p><p className={`mt-5 text-sm ${failedJobs ? "text-red-300" : "text-green-300"}`}>{failedJobs} failed job{failedJobs === 1 ? "" : "s"}</p><Link href="/admin/jobs" className="mt-5 inline-flex text-xs font-semibold text-zinc-300 hover:text-white">Inspect jobs and logs →</Link></GlassCard>
    </div>
  </>;
}
