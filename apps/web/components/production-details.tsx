import type { MovieDetails, PersonCredit, TvDetails } from "@mediamatrix/shared";
import { GlassCard } from "@mediamatrix/ui";

export function ProductionDetails({ media }: { media: MovieDetails | TvDetails }) {
  const director = media.crew.find((person) => person.job === "Director");
  const creators = media.crew.filter((person) => ["Creator", "Executive Producer", "Writer"].includes(person.job ?? "")).slice(0, 3);
  return <GlassCard className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Original title" value={media.originalTitle || media.title} /><Detail label="Status" value={media.status || "Unknown"} />{media.type === "movie" ? <><Detail label="Director" value={director?.name || "Not listed"} /><Detail label="Production" value={media.productionCompanies.slice(0, 3).join(", ") || "Not listed"} /></> : <><Detail label="Episodes" value={`${media.numberOfEpisodes} across ${media.numberOfSeasons} seasons`} /><Detail label="Creative team" value={names(creators) || "Not listed"} /></>}</GlassCard>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><h2 className="text-[10px] font-bold uppercase tracking-[.15em] text-zinc-600">{label}</h2><p className="mt-2 text-xs leading-5 text-zinc-300">{value}</p></div>; }
function names(people: PersonCredit[]) { return [...new Set(people.map((person) => person.name))].join(", "); }
