import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import type { PersonCredit } from "@mediamatrix/shared";
import { tmdbImage } from "@/lib/images";

export function CastSection({ cast }: { cast: PersonCredit[] }) {
  if (!cast.length) return null;
  return <section className="py-8"><p className="eyebrow">The people behind it</p><h2 className="section-title mb-5 mt-1.5">Featured cast</h2><div className="media-scroller no-scrollbar flex gap-4 overflow-x-auto pb-3">{cast.slice(0, 18).map((person, index) => { const image = tmdbImage(person.profilePath, "w185"); return <Link href={`/person/${person.id}`} key={`${person.id}-${index}`} className="group w-24 shrink-0 text-center sm:w-28"><div className="relative mx-auto aspect-square overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.05]">{image ? <Image src={image} alt="" fill sizes="112px" className="object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-zinc-600"><UserRound size={28} /></div>}</div><h3 className="mt-3 line-clamp-2 text-xs font-semibold text-zinc-200">{person.name}</h3><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-500">{person.character}</p></Link>; })}</div></section>;
}
