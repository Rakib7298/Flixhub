"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Clapperboard, Compass, LayoutDashboard, Radio, Search, UserRound, X } from "lucide-react";
import { Logo, cn } from "@mediamatrix/ui";

const links = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/tv", label: "TV Series", icon: Radio },
  { href: "/live-tv", label: "Live TV", icon: Radio },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setSearchOpen(false), [pathname]);

  function closeSearch() {
    if (!searchOpen) return;
    setSearchOpen(false);
    requestAnimationFrame(() => searchToggle.current?.focus());
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || searchOpen ? "bg-[#080a0d]/85 shadow-lg shadow-black/10 backdrop-blur-xl" : "bg-gradient-to-b from-black/75 to-transparent")}>
      <div className="page-container flex h-[76px] items-center gap-4">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="MediaMatrix home"><Logo /></Link>
        <nav className="glass-panel mx-auto hidden items-center gap-1 rounded-full p-1.5 lg:flex" aria-label="Main navigation">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("rounded-full px-4 py-2 text-[13px] font-medium transition", active ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:bg-white/[.07] hover:text-white")} aria-current={active ? "page" : undefined}>{label}</Link>;
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <form onSubmit={submitSearch} className={cn("relative transition-all", searchOpen ? "absolute inset-x-4 top-3 z-10 sm:static sm:inset-auto" : "hidden sm:block")} role="search">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") closeSearch(); }} className={cn("field rounded-full pl-10 pr-10", searchOpen ? "h-12 w-full sm:w-64" : "h-10 min-h-10 w-44 bg-black/25 lg:w-52 xl:w-60")} placeholder="Search titles…" aria-label="Search movies and TV" autoFocus={searchOpen} />
            {searchOpen && <button type="button" onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:text-white" aria-label="Close search"><X size={17} /></button>}
          </form>
          {!searchOpen && <button ref={searchToggle} onClick={() => setSearchOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white sm:hidden" aria-label="Open search"><Search size={19} /></button>}
          <Link href={session?.user ? "/account" : "/login"} className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-2.5 text-xs font-semibold text-zinc-200 backdrop-blur-md transition hover:bg-white/[.12] sm:px-4" aria-label={session?.user ? "Your account" : "Sign in"}>
            <UserRound size={16} />
            <span className="hidden max-w-24 truncate sm:inline">{session?.user?.name || (session?.user ? "Account" : "Sign in")}</span>
          </Link>
          {session?.user?.role === "ADMIN" && <Link href="/admin" className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[.07] text-zinc-300 hover:text-white md:flex" aria-label="Admin dashboard"><LayoutDashboard size={17} /></Link>}
        </div>
      </div>
    </header>
  );
}
