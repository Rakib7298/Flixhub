import Image from "next/image";
import Link from "next/link";
import { Film, Star, Tv } from "lucide-react";
import type { MediaSummary } from "@mediamatrix/shared";
import { releaseYear } from "@mediamatrix/shared";
import { tmdbImage } from "@/lib/images";

export function MediaCard({ media, priority = false, compact = false }: { media: MediaSummary; priority?: boolean; compact?: boolean }) {
  const poster = tmdbImage(media.posterPath, "w342");
  const href = media.type === "movie" ? `/movie/${media.id}` : `/tv/${media.id}`;
  return (
    <article className={compact ? "group w-full" : "group w-[148px] shrink-0 sm:w-[176px] lg:w-[188px]"}>
      <Link href={href} className="block rounded-2xl focus-visible:outline-offset-4" aria-label={`${media.title} (${releaseYear(media.releaseDate)})`}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/[.08] bg-matrix-card shadow-lg shadow-black/20 transition duration-300 group-hover:-translate-y-1.5 group-hover:border-white/20 group-hover:shadow-2xl group-hover:shadow-black/50">
          {poster ? <Image src={poster} alt="" fill priority={priority} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 190px" className="object-cover transition duration-500 group-hover:scale-[1.045]" /> : <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[.07] to-transparent p-4 text-zinc-600"><Film size={32} /><span className="text-center text-xs">Poster unavailable</span></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10 opacity-80" />
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md"><Star size={10} className="fill-matrix-yellow text-matrix-yellow" />{media.rating > 0 ? media.rating.toFixed(1) : "NR"}</div>
          <div className="absolute bottom-2.5 right-2.5 rounded-md border border-white/10 bg-black/60 p-1.5 text-zinc-200 backdrop-blur-md">{media.type === "movie" ? <Film size={12} /> : <Tv size={12} />}</div>
        </div>
        <div className="px-0.5 pt-3">
          <h3 className="truncate text-[13px] font-semibold text-zinc-100 transition group-hover:text-white sm:text-sm">{media.title}</h3>
          <p className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-500"><span>{releaseYear(media.releaseDate)}</span><span className="h-0.5 w-0.5 rounded-full bg-zinc-700" /><span>{media.type === "movie" ? "Movie" : "Series"}</span></p>
        </div>
      </Link>
    </article>
  );
}
