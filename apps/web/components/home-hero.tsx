"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clapperboard, Play, Search, Sparkles, Star } from "lucide-react";
import type { MediaSummary } from "@mediamatrix/shared";
import { releaseYear } from "@mediamatrix/shared";
import { Badge } from "@mediamatrix/ui";
import { tmdbImage } from "@/lib/images";

export function HomeHero({ featured }: { featured?: MediaSummary | undefined }) {
  const backdrop = featured ? tmdbImage(featured.backdropPath, "original") : null;
  const href = featured ? (featured.type === "movie" ? `/movie/${featured.id}` : `/tv/${featured.id}`) : "/search";
  return (
    <section className="relative isolate min-h-[680px] overflow-hidden pb-16 pt-28 sm:min-h-[720px] sm:pt-32 lg:min-h-[760px] lg:pb-24">
      <div className="absolute inset-0 -z-20 bg-radial-spotlight" />
      {backdrop && <motion.div initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1 }} className="hero-mask absolute inset-0 -z-10"><Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover object-[65%_center] opacity-60" /></motion.div>}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#080A0D_0%,rgba(8,10,13,.94)_28%,rgba(8,10,13,.45)_68%,rgba(8,10,13,.68)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-matrix-bg to-transparent" />
      {!featured && <HeroBackdropArt />}
      <div className="page-container relative flex min-h-[520px] items-center">
        <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }} className="max-w-2xl py-12">
          <motion.div variants={item} className="mb-5 flex items-center gap-3"><Badge tone="red"><Sparkles size={11} />{featured ? "Featured today" : "Your cinematic universe"}</Badge>{featured && <span className="text-xs font-medium capitalize text-zinc-400">{featured.type === "movie" ? "Feature film" : "Series spotlight"}</span>}</motion.div>
          <motion.h1 variants={item} className="text-balance text-[42px] font-black leading-[1.02] tracking-[-.055em] text-white min-[480px]:text-5xl sm:text-6xl lg:text-[76px]">{featured ? featured.title : <>Every story.<br /><span className="bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">One matrix.</span></>}</motion.h1>
          {featured ? <><motion.div variants={item} className="mt-5 flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-300"><span className="flex items-center gap-1.5"><Star size={14} className="fill-matrix-yellow text-matrix-yellow" />{featured.rating.toFixed(1)}</span><span className="flex items-center gap-1.5"><Calendar size={14} />{releaseYear(featured.releaseDate)}</span><span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px]">HD</span></motion.div><motion.p variants={item} className="text-pretty mt-5 line-clamp-3 max-w-xl text-sm leading-7 text-zinc-300 sm:text-[15px]">{featured.overview || "Explore the full details, cast, recommendations, and official viewing options."}</motion.p></> : <motion.p variants={item} className="text-pretty mt-6 max-w-xl text-[15px] leading-7 text-zinc-400 sm:text-base">Discover films and series, compare official viewing options, and keep every story that matters in one beautifully organized place.</motion.p>}
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Link href={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-matrix-red px-6 text-sm font-bold text-white shadow-glow transition hover:bg-red-600">{featured ? <Play size={17} className="fill-current" /> : <Search size={17} />}{featured ? "Explore title" : "Start discovering"}</Link>
            <Link href={featured ? "/search" : "/movies"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[.09] px-6 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/[.15]">{featured ? "Find another" : "Browse movies"}<ArrowRight size={16} /></Link>
          </motion.div>
          {!featured && <motion.div variants={item} className="mt-9 flex items-center gap-5 text-[11px] font-medium text-zinc-500"><span className="flex items-center gap-2"><Clapperboard size={14} />Movies & series</span><span className="h-1 w-1 rounded-full bg-zinc-700" /><span>Official availability</span><span className="h-1 w-1 rounded-full bg-zinc-700" /><span>Your watchlist</span></motion.div>}
        </motion.div>
      </div>
    </section>
  );
}

const item = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };

function HeroBackdropArt() {
  return <div className="absolute inset-y-0 right-0 -z-10 hidden w-[55%] items-center justify-center lg:flex" aria-hidden="true"><motion.div initial={{ opacity: 0, rotateY: -16, x: 40 }} animate={{ opacity: 1, rotateY: -8, x: 0 }} transition={{ duration: 1 }} className="relative h-[430px] w-[570px] [perspective:1000px]"><div className="absolute right-16 top-8 h-[380px] w-[255px] rotate-[9deg] rounded-[28px] border border-white/10 bg-gradient-to-br from-[#272d36] to-[#0d1015] p-4 shadow-2xl shadow-black/60"><div className="flex h-full flex-col justify-end rounded-[20px] bg-[radial-gradient(circle_at_60%_30%,rgba(229,9,20,.5),transparent_30%),linear-gradient(150deg,#232b37,#0b0d12_65%)] p-6"><LogoMark /><p className="mt-3 text-xs font-bold uppercase tracking-[.22em] text-zinc-400">Stories await</p></div></div><div className="absolute right-64 top-20 h-[330px] w-[220px] -rotate-[10deg] rounded-[26px] border border-white/10 bg-gradient-to-br from-[#1b2530] to-[#0c1014] shadow-2xl shadow-black/50"><div className="h-full rounded-[26px] bg-[radial-gradient(circle_at_30%_35%,rgba(58,93,125,.55),transparent_35%)]" /></div></motion.div></div>;
}

function LogoMark() { return <div className="grid w-10 grid-cols-2 gap-1"><span className="aspect-square rounded-[4px] bg-matrix-red" /><span className="aspect-square rounded-[4px] bg-white/80" /><span className="aspect-square rounded-[4px] bg-white/25" /><span className="aspect-square rounded-[4px] bg-white/60" /></div>; }
