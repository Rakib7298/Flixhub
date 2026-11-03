import Link from "next/link";
import { Logo } from "@mediamatrix/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[.06] bg-[#07090b] pb-24 pt-12 md:pb-8">
      <div className="page-container">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-500">An independent home for discovering stories, finding official viewing options, and managing media you are authorized to access.</p>
          </div>
          <FooterColumn title="Explore" links={[["Movies", "/movies"], ["TV Series", "/tv"], ["Search", "/search"], ["Live TV", "/live-tv"]]} />
          <FooterColumn title="Your space" links={[["Watchlist", "/watchlist"], ["Favorites", "/favorites"], ["Continue watching", "/history"], ["Account", "/account"]]} />
          <FooterColumn title="Project" links={[["Documentation", "https://github.com/Rakib7298/Flixhub"], ["System status", "/api/health"]]} />
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/[.06] pt-6 text-xs leading-5 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MediaMatrix. Built for authorized media access.</p>
          <p className="max-w-xl">Metadata support by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Availability varies by country and provider.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return <div><h2 className="text-xs font-bold uppercase tracking-[.16em] text-zinc-300">{title}</h2><ul className="mt-4 space-y-3">{links.map(([label, href]) => <li key={href}><Link href={href ?? "#"} className="text-sm text-zinc-500 transition hover:text-white">{label}</Link></li>)}</ul></div>;
}
