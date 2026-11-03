"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Clapperboard, Radio, Bookmark, Search } from "lucide-react";
import { cn } from "@mediamatrix/ui";

const items = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/live-tv", label: "Live TV", icon: Radio },
  { href: "/watchlist", label: "My List", icon: Bookmark },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="glass-panel fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl p-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] md:hidden" aria-label="Mobile navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-medium transition", active ? "bg-white/[.08] text-white" : "text-zinc-500")} aria-current={active ? "page" : undefined}>
            <Icon size={19} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-red-500" : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
