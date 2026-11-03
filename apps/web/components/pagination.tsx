import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, pathname, query }: { page: number; totalPages: number; pathname: string; query: Record<string, string | number | undefined> }) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams();
    Object.entries({ ...query, page: target }).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
    return `${pathname}?${params.toString()}`;
  };
  return <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={href(Math.max(1, page - 1))} className={`inline-flex h-10 items-center gap-1 rounded-full border border-white/10 px-4 text-xs font-semibold ${page <= 1 ? "pointer-events-none opacity-30" : "text-zinc-300 hover:bg-white/10"}`}><ChevronLeft size={15} />Previous</Link><span className="text-xs text-zinc-500">Page <strong className="text-white">{page}</strong> of {totalPages}</span><Link aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined} href={href(Math.min(totalPages, page + 1))} className={`inline-flex h-10 items-center gap-1 rounded-full border border-white/10 px-4 text-xs font-semibold ${page >= totalPages ? "pointer-events-none opacity-30" : "text-zinc-300 hover:bg-white/10"}`}>Next<ChevronRight size={15} /></Link></nav>;
}
