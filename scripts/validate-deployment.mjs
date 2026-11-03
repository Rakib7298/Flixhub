import { readFile } from "node:fs/promises";
import { parse } from "yaml";

const checked = [];
const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
if (vercel.framework !== "nextjs" || !vercel.buildCommand || vercel.outputDirectory !== "apps/web/.next") throw new Error("Vercel configuration is incomplete.");
checked.push("vercel.json: valid JSON with Next.js workspace build");

const netlify = await readFile("netlify.toml", "utf8");
if (!netlify.includes("@netlify/plugin-nextjs") || !netlify.includes('publish = "apps/web/.next"')) throw new Error("Netlify Next.js runtime or publish path is missing.");
checked.push("netlify.toml: Next.js runtime and workspace publish path present");

const compose = parse(await readFile("docker-compose.yml", "utf8"));
for (const service of ["postgres", "web", "transcoder", "sync-worker", "playlist-worker"]) if (!compose.services?.[service]) throw new Error(`Compose service ${service} is missing.`);
if (!compose.volumes || !Object.hasOwn(compose.volumes, "postgres-data") || !Object.hasOwn(compose.volumes, "transcoder-data")) throw new Error("Required persistent volumes are missing.");
checked.push("docker-compose.yml: YAML parsed; web, database, workers, transcoder, and volumes present");

const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
for (const job of ["quality", "browser", "containers", "exports"]) if (!workflow.jobs?.[job]) throw new Error(`CI job ${job} is missing.`);
checked.push("CI workflow: YAML parsed; quality, browser, containers, and exports jobs present");

for (const file of ["web.Dockerfile", "transcoder.Dockerfile", "worker.Dockerfile"]) {
  const content = await readFile(`infrastructure/docker/${file}`, "utf8");
  if (!content.includes("USER node")) throw new Error(`${file} must run as a non-root user.`);
  checked.push(`${file}: non-root runtime declared`);
}
console.log(`Deployment configuration structural validation passed (${checked.length} checks).\n${checked.map((item) => `✓ ${item}`).join("\n")}`);
console.log("This does not replace provider deployment, Docker execution, or docker compose config validation.");
