import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, MapPin, UserRound } from "lucide-react";
import { TmdbError } from "@mediamatrix/tmdb";
import { getTmdbClient } from "@/lib/tmdb";
import { tmdbImage } from "@/lib/images";
import { MediaGrid } from "@/components/media-grid";
import { ConfigurationNotice } from "@/components/configuration-notice";

interface Props { params: Promise<{ id: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { id } = await params; const client = getTmdbClient(); if (!client) return { title: "Person" }; try { const person = await client.person(Number(id)); return { title: person.name, description: person.biography.slice(0, 160) }; } catch { return { title: "Person" }; } }

export default async function PersonPage({ params }: Props) {
  const { id: rawId } = await params; const id = Number(rawId); if (!Number.isInteger(id) || id < 1) notFound();
  const client = getTmdbClient(); if (!client) return <div className="page-container pt-28"><ConfigurationNotice /></div>;
  try {
    const person = await client.person(id); const image = tmdbImage(person.profilePath, "h632");
    return <div className="page-container pb-16 pt-28 sm:pt-32"><section className="grid gap-8 md:grid-cols-[240px_1fr] lg:gap-12"><div className="relative mx-auto aspect-[2/3] w-52 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] md:w-full">{image ? <Image src={image} alt={`${person.name} profile`} fill priority sizes="240px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-600"><UserRound size={48} /></div>}</div><div><p className="eyebrow">People in the matrix</p><h1 className="mt-2 text-4xl font-black tracking-[-.045em] sm:text-5xl">{person.name}</h1><div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">{person.birthday && <span className="flex items-center gap-1.5"><Calendar size={13} />Born {person.birthday}</span>}{person.placeOfBirth && <span className="flex items-center gap-1.5"><MapPin size={13} />{person.placeOfBirth}</span>}</div><h2 className="mt-8 text-sm font-bold">Biography</h2><p className="whitespace-pre-line text-pretty mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{person.biography || "No biography is available from the metadata provider."}</p></div></section><section className="mt-14"><h2 className="section-title mb-6">Known for</h2><MediaGrid items={person.knownFor} /></section></div>;
  } catch (error) { if (error instanceof TmdbError && error.status === 404) notFound(); throw error; }
}
