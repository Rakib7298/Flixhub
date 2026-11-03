import Link from "next/link";
import { KeyRound, Settings2 } from "lucide-react";
import { GlassCard } from "@mediamatrix/ui";

export function ConfigurationNotice({ integration = "TMDB" }: { integration?: string }) {
  return <GlassCard className="my-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-300"><KeyRound size={19} /></div><div><h2 className="text-sm font-semibold text-white">Connect {integration} to load real content</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-400">No catalog credentials are configured, so MediaMatrix is showing an honest empty state rather than sample data. Add the server-side environment variables documented in README.md.</p></div></div><Link href="/api/health" className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white"><Settings2 size={14} />View integration status</Link></GlassCard>;
}
