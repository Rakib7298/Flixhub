import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/client";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed PostgreSQL.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const movieGenres: Array<[number, string]> = [[28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"], [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"], [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Science Fiction"], [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"]];
const tvGenres: Array<[number, string]> = [[10759, "Action & Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"], [99, "Documentary"], [18, "Drama"], [10751, "Family"], [10762, "Kids"], [9648, "Mystery"], [10763, "News"], [10764, "Reality"], [10765, "Sci-Fi & Fantasy"], [10766, "Soap"], [10767, "Talk"], [10768, "War & Politics"], [37, "Western"]];

async function main() {
  for (const name of ["USER", "ADMIN"] as const) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const [type, genres] of [["movie", movieGenres], ["tv", tvGenres]] as const) {
    for (const [id, name] of genres) {
      await prisma.genre.upsert({ where: { id_type: { id, type } }, update: { name }, create: { id, name, type } });
    }
  }

  if (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) throw new Error("ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters are both required to seed an administrator.");
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const passwordHash = await hash(password, 12);
    const username = (process.env.ADMIN_USERNAME || email.split("@")[0] || "admin").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30);
    await prisma.user.upsert({
      where: { email },
      update: { roleId: adminRole.id, passwordHash, deletedAt: null },
      create: { email, username, passwordHash, roleId: adminRole.id, preference: { create: {} } },
    });
    console.log("Administrator account seeded. The credential values were not logged.");
  }
  console.log("Roles and canonical TMDB genre mappings seeded.");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Database seed failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
