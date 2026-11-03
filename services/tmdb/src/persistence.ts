import { db, Prisma } from "@mediamatrix/database";
import type { MovieDetails, PersonCredit, TvDetails } from "@mediamatrix/shared";

export async function persistMovieMetadata(movie: MovieDetails) {
  return db.$transaction(async (tx) => {
    const record = await tx.movie.upsert({
      where: { tmdbId: movie.id },
      update: movieData(movie),
      create: { tmdbId: movie.id, ...movieData(movie) },
    });
    for (const genre of movie.genres) {
      await tx.genre.upsert({ where: { id_type: { id: genre.id, type: "movie" } }, update: { name: genre.name }, create: { id: genre.id, name: genre.name, type: "movie" } });
    }
    await tx.movieGenre.deleteMany({ where: { movieId: record.id } });
    if (movie.genres.length) await tx.movieGenre.createMany({ data: movie.genres.map((genre) => ({ movieId: record.id, genreId: genre.id, genreType: "movie" as const })) });
    await syncCredits(tx, movie.id, "movie", record.id, [...movie.cast, ...movie.crew]);
    await tx.systemSetting.upsert({ where: { key: "tmdb.lastSyncAt" }, update: { value: new Date().toISOString() }, create: { key: "tmdb.lastSyncAt", value: new Date().toISOString() } });
    return record;
  }, { timeout: 60_000 });
}

export async function persistTvMetadata(show: TvDetails) {
  return db.$transaction(async (tx) => {
    const record = await tx.tvSeries.upsert({
      where: { tmdbId: show.id },
      update: tvData(show),
      create: { tmdbId: show.id, ...tvData(show) },
    });
    for (const genre of show.genres) {
      await tx.genre.upsert({ where: { id_type: { id: genre.id, type: "tv" } }, update: { name: genre.name }, create: { id: genre.id, name: genre.name, type: "tv" } });
    }
    await tx.tvGenre.deleteMany({ where: { tvSeriesId: record.id } });
    if (show.genres.length) await tx.tvGenre.createMany({ data: show.genres.map((genre) => ({ tvSeriesId: record.id, genreId: genre.id, genreType: "tv" as const })) });
    for (const season of show.seasons) {
      await tx.season.upsert({
        where: { tmdbId: season.id },
        update: { tvSeriesId: record.id, seasonNumber: season.seasonNumber, name: season.name, overview: season.overview, airDate: date(season.airDate), posterPath: season.posterPath },
        create: { tmdbId: season.id, tvSeriesId: record.id, seasonNumber: season.seasonNumber, name: season.name, overview: season.overview, airDate: date(season.airDate), posterPath: season.posterPath },
      });
    }
    await syncCredits(tx, show.id, "tv", record.id, [...show.cast, ...show.crew]);
    await tx.systemSetting.upsert({ where: { key: "tmdb.lastSyncAt" }, update: { value: new Date().toISOString() }, create: { key: "tmdb.lastSyncAt", value: new Date().toISOString() } });
    return record;
  }, { timeout: 60_000 });
}

async function syncCredits(tx: Prisma.TransactionClient, tmdbId: number, type: "movie" | "tv", parentId: string, credits: PersonCredit[]) {
  const unique = [...new Map(credits.map((credit) => [`${credit.id}:${credit.character ?? credit.job ?? ""}`, credit])).values()].filter((credit) => credit.id && credit.name);
  const people = new Map<number, string>();
  for (const credit of unique) {
    const person = await tx.person.upsert({ where: { tmdbId: credit.id }, update: { name: credit.name, profilePath: credit.profilePath }, create: { tmdbId: credit.id, name: credit.name, profilePath: credit.profilePath, biography: "" } });
    people.set(credit.id, person.id);
  }
  if (type === "movie") {
    await tx.mediaCredit.deleteMany({ where: { movieId: parentId } });
    if (unique.length) await tx.mediaCredit.createMany({ data: unique.map((credit, index) => ({ personId: people.get(credit.id)!, movieId: parentId, character: credit.character, job: credit.job, creditOrder: index })) });
  } else {
    await tx.mediaCredit.deleteMany({ where: { tvSeriesId: parentId } });
    if (unique.length) await tx.mediaCredit.createMany({ data: unique.map((credit, index) => ({ personId: people.get(credit.id)!, tvSeriesId: parentId, character: credit.character, job: credit.job, creditOrder: index })) });
  }
  await tx.systemSetting.upsert({ where: { key: `tmdb.lastCreditSync.${type}.${tmdbId}` }, update: { value: new Date().toISOString() }, create: { key: `tmdb.lastCreditSync.${type}.${tmdbId}`, value: new Date().toISOString() } });
}

function movieData(movie: MovieDetails) {
  return { title: movie.title, originalTitle: movie.originalTitle || null, overview: movie.overview, posterPath: movie.posterPath, backdropPath: movie.backdropPath, releaseDate: date(movie.releaseDate), runtime: movie.runtime, rating: movie.rating, voteCount: movie.voteCount, popularity: movie.popularity, status: movie.status || null, tagline: movie.tagline || null, syncedAt: new Date() };
}
function tvData(show: TvDetails) {
  return { name: show.title, originalName: show.originalTitle || null, overview: show.overview, posterPath: show.posterPath, backdropPath: show.backdropPath, firstAirDate: date(show.releaseDate), rating: show.rating, voteCount: show.voteCount, popularity: show.popularity, status: show.status || null, numberOfSeasons: show.numberOfSeasons, numberOfEpisodes: show.numberOfEpisodes, syncedAt: new Date() };
}
function date(value: string | null): Date | null { if (!value) return null; const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`); return Number.isNaN(parsed.getTime()) ? null : parsed; }
