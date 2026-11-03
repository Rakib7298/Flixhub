"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaSummary } from "@mediamatrix/shared";
import { EmptyState } from "@mediamatrix/ui";
import { MediaCard } from "./media-card";

export function MediaCarousel({ title, eyebrow, items, href, emptyMessage = "No titles are available for this section yet." }: { title: string; eyebrow?: string; items: MediaSummary[]; href?: string; emptyMessage?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  function scroll(direction: number) {
    scroller.current?.scrollBy({ left: direction * Math.min(scroller.current.clientWidth * 0.8, 800), behavior: "smooth" });
  }
  return (
    <section className="py-5 sm:py-7" aria-labelledby={`section-${title.replace(/\W/g, "-").toLowerCase()}`}>
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>{eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}<h2 id={`section-${title.replace(/\W/g, "-").toLowerCase()}`} className="section-title">{title}</h2></div>
        <div className="flex items-center gap-2">
          {href && <Link href={href} className="mr-1 hidden items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white sm:flex">View all <ArrowRight size={14} /></Link>}
          {items.length > 0 && <div className="hidden gap-1.5 md:flex"><button onClick={() => scroll(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label={`Scroll ${title} left`}><ChevronLeft size={17} /></button><button onClick={() => scroll(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label={`Scroll ${title} right`}><ChevronRight size={17} /></button></div>}
        </div>
      </div>
      {items.length ? <div ref={scroller} className="media-scroller no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:-mx-6 sm:gap-4 sm:px-6 lg:-mx-10 lg:px-10 xl:-mx-12 xl:px-12">{items.map((item, index) => <MediaCard key={`${item.type}-${item.id}`} media={item} priority={index < 2} />)}</div> : <EmptyState title="Nothing here yet" description={emptyMessage} />}
    </section>
  );
}
