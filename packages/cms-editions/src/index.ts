import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { XMLValidator } from "fast-xml-parser";

const exec = promisify(execFile);
const VERSION = "1.0.0";
const ARTIFACT_NAMES = {
  full: `mediamatrix-v${VERSION}-full-source.tar.gz`,
  vercel: `mediamatrix-v${VERSION}-vercel.tar.gz`,
  netlify: `mediamatrix-v${VERSION}-netlify.tar.gz`,
  wordpress: `mediamatrix-v${VERSION}-wordpress.zip`,
  blogger: `mediamatrix-v${VERSION}-blogger.xml`,
} as const;

export interface ExportArtifact { name: string; bytes: number; sha256: string; contentType: string }
export interface ExportManifest { version: string; commit: string; generatedAt: string; artifacts: ExportArtifact[]; verification: unknown; validation: string[] }

async function run(command: string, args: string[], cwd: string) {
  return exec(command, args, { cwd, timeout: 120_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
}

export async function findRepositoryRoot(start = process.cwd()) {
  if (process.env.MEDIAMATRIX_REPOSITORY_ROOT) return path.resolve(process.env.MEDIAMATRIX_REPOSITORY_ROOT);
  let current = path.resolve(start);
  for (let index = 0; index < 8; index += 1) {
    try { await stat(path.join(current, "pnpm-workspace.yaml")); return current; } catch { /* continue upwards */ }
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
  throw new Error("Could not locate the MediaMatrix repository root. Set MEDIAMATRIX_REPOSITORY_ROOT for standalone deployments.");
}

function exportDirectory(root: string) {
  const directory = path.resolve(process.env.MEDIAMATRIX_EXPORT_DIR || path.join(os.tmpdir(), "mediamatrix-exports"));
  if (directory === root || directory.startsWith(`${root}${path.sep}`)) throw new Error("Export output must remain outside the source tree.");
  return directory;
}

async function digest(file: string) { return createHash("sha256").update(await readFile(file)).digest("hex"); }
async function artifact(file: string, contentType: string): Promise<ExportArtifact> { return { name: path.basename(file), bytes: (await stat(file)).size, sha256: await digest(file), contentType }; }

export function assertSafeEntries(entries: string[]) {
  const forbidden = /(^|\/)(node_modules|\.next|\.git|dist|build|coverage|playwright-report)(\/|$)|(^|\/)\.env($|\.)/;
  for (const entry of entries) {
    const normalized = entry.replace(/^\.\//, "");
    const portable = normalized.replaceAll("\\", "/");
    if (portable.split("/").some((segment) => segment === "..") || path.posix.isAbsolute(portable) || path.win32.isAbsolute(entry)) throw new Error(`Unsafe archive entry: ${entry}`);
    if (forbidden.test(portable) && !portable.endsWith(".env.example")) throw new Error(`Forbidden archive entry: ${entry}`);
    if (/\.(pem|p12|pfx)$/i.test(portable)) throw new Error(`Private key material is not permitted: ${entry}`);
  }
}

async function validateTar(file: string) {
  const { stdout } = await run("tar", ["-tzf", file], path.dirname(file));
  const entries = stdout.split("\n").filter(Boolean); if (!entries.some((entry) => /package\.json$/.test(entry)) || !entries.some((entry) => /pnpm-workspace\.yaml$/.test(entry))) throw new Error("Source archive is missing required workspace files.");
  assertSafeEntries(entries); return `${path.basename(file)}: ${entries.length} safe entries`;
}

async function directoryFiles(directory: string, prefix = ""): Promise<Array<{ absolute: string; relative: string }>> {
  const entries = await readdir(directory, { withFileTypes: true }); const result: Array<{ absolute: string; relative: string }> = [];
  for (const entry of entries) { const absolute = path.join(directory, entry.name); const relative = path.posix.join(prefix, entry.name); if (entry.isDirectory()) result.push(...await directoryFiles(absolute, relative)); else if (entry.isFile()) result.push({ absolute, relative }); }
  return result;
}

async function createWordpressZip(source: string, destination: string) {
  const theme = path.join(source, "packages/cms-editions/wordpress/mediamatrix"); const files = await directoryFiles(theme, "mediamatrix"); const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[file.relative] = new Uint8Array(await readFile(file.absolute));
  const zipped = zipSync(entries, { level: 6 }); await writeFile(destination, zipped);
  const check = unzipSync(new Uint8Array(await readFile(destination))); const names = Object.keys(check); assertSafeEntries(names);
  for (const required of ["mediamatrix/style.css", "mediamatrix/functions.php", "mediamatrix/index.php", "mediamatrix/assets/app.js"]) if (!check[required]) throw new Error(`WordPress theme is missing ${required}.`);
  const style = strFromU8(check["mediamatrix/style.css"]!); const functions = strFromU8(check["mediamatrix/functions.php"]!);
  if (!/Theme Name:\s*MediaMatrix/.test(style) || !/register_rest_route/.test(functions) || !/wp_remote_get/.test(functions)) throw new Error("WordPress theme structural validation failed.");
  return `WordPress ZIP: ${names.length} validated theme files`;
}

async function createBlogger(source: string, destination: string) {
  const xml = await readFile(path.join(source, "packages/cms-editions/blogger/mediamatrix-blogger.xml"), "utf8");
  const valid = XMLValidator.validate(xml); if (valid !== true) throw new Error(`Blogger XML validation failed: ${valid.err.msg}`);
  for (const token of ["<b:skin>", "<b:section", "<b:widget", "data-api-base", "mm-search"]) if (!xml.includes(token)) throw new Error(`Blogger template is missing ${token}.`);
  await writeFile(destination, xml); return "Blogger XML: well-formed with required Blogger structures";
}

let exportInProgress = false;
export async function createDistributionExports() {
  if (exportInProgress) throw new Error("Another export is already running."); exportInProgress = true;
  let staging = "";
  try {
    const root = await findRepositoryRoot(); const output = exportDirectory(root); staging = path.join(output, `.staging-${randomUUID()}`);
    const { stdout: dirty } = await run("git", ["status", "--porcelain"], root); if (dirty.trim()) throw new Error("Commit or stash all changes before exporting. Archives are created only from HEAD.");
    const { stdout: commitOutput } = await run("git", ["rev-parse", "HEAD"], root); const commit = commitOutput.trim(); const generatedAt = new Date().toISOString();
    await mkdir(path.join(staging, "source"), { recursive: true }); await mkdir(output, { recursive: true });
    await run("git", ["archive", "--format=tar.gz", "-o", path.join(staging, "source.tar.gz"), "HEAD"], root);
    await run("tar", ["-xzf", path.join(staging, "source.tar.gz"), "-C", path.join(staging, "source")], staging);
    const source = path.join(staging, "source"); let verification: unknown = { status: "not supplied", note: "Run release verification before production distribution." };
    try { verification = JSON.parse(await readFile(path.join(source, "release/verification.json"), "utf8")); } catch { /* honest metadata when no report exists */ }
    const buildInfo = { name: "MediaMatrix", version: VERSION, commit, generatedAt, runtime: { node: process.version }, verification };
    await writeFile(path.join(source, "BUILD_INFO.json"), JSON.stringify(buildInfo, null, 2));
    const validation: string[] = []; const artifacts: ExportArtifact[] = [];
    const full = path.join(output, ARTIFACT_NAMES.full); await run("tar", ["-czf", full, "-C", source, "."], staging); validation.push(await validateTar(full)); artifacts.push(await artifact(full, "application/gzip"));
    for (const target of ["vercel", "netlify"] as const) {
      const targetSource = path.join(staging, target); await cp(source, targetSource, { recursive: true }); await writeFile(path.join(targetSource, "DEPLOYMENT_TARGET.json"), JSON.stringify({ target, version: VERSION, commit }, null, 2));
      const file = path.join(output, ARTIFACT_NAMES[target]); await run("tar", ["-czf", file, "-C", targetSource, "."], staging); validation.push(await validateTar(file)); artifacts.push(await artifact(file, "application/gzip"));
    }
    const wordpress = path.join(output, ARTIFACT_NAMES.wordpress); validation.push(await createWordpressZip(source, wordpress)); artifacts.push(await artifact(wordpress, "application/zip"));
    const blogger = path.join(output, ARTIFACT_NAMES.blogger); validation.push(await createBlogger(source, blogger)); artifacts.push(await artifact(blogger, "application/xml"));
    const manifest: ExportManifest = { version: VERSION, commit, generatedAt, artifacts, verification, validation };
    await writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
    await writeFile(path.join(output, "SHA256SUMS.txt"), artifacts.map((item) => `${item.sha256}  ${item.name}`).join("\n") + "\n");
    await writeFile(path.join(output, "BUILD_INFO.json"), JSON.stringify(buildInfo, null, 2));
    return manifest;
  } finally { exportInProgress = false; if (staging) await rm(staging, { recursive: true, force: true }); }
}

export async function readExportManifest(): Promise<ExportManifest | null> {
  const root = await findRepositoryRoot(); try { return JSON.parse(await readFile(path.join(exportDirectory(root), "manifest.json"), "utf8")) as ExportManifest; } catch { return null; }
}
export async function resolveExportArtifact(name: string) {
  const manifest = await readExportManifest(); const item = manifest?.artifacts.find((candidate) => candidate.name === name); if (!item || name !== path.basename(name)) return null;
  const root = await findRepositoryRoot(); const file = path.join(exportDirectory(root), name); const actual = await digest(file); if (actual !== item.sha256) throw new Error("Artifact checksum does not match the manifest. Regenerate exports."); return { file, item };
}
export async function validateExistingExports() {
  const manifest = await readExportManifest(); if (!manifest) throw new Error("No export manifest found. Run pnpm export:all first.");
  const root = await findRepositoryRoot(); const output = exportDirectory(root); const validation: string[] = [];
  for (const item of manifest.artifacts) {
    const resolved = await resolveExportArtifact(item.name); if (!resolved) throw new Error(`Missing artifact ${item.name}.`);
    if (item.name.endsWith(".tar.gz")) validation.push(await validateTar(resolved.file));
    else if (item.name.endsWith(".xml")) validation.push(await createBloggerValidation(resolved.file));
    else if (item.name.endsWith(".zip")) {
      const check = unzipSync(new Uint8Array(await readFile(resolved.file))); const names = Object.keys(check); assertSafeEntries(names);
      for (const required of ["mediamatrix/style.css", "mediamatrix/functions.php", "mediamatrix/index.php", "mediamatrix/assets/app.js"]) if (!check[required]) throw new Error(`WordPress theme is missing ${required}.`);
      validation.push(`WordPress ZIP: ${names.length} files and checksum verified`);
    }
  }
  return { manifest, validation, output };
}

async function createBloggerValidation(file: string) { const xml = await readFile(file, "utf8"); const result = XMLValidator.validate(xml); if (result !== true) throw new Error(result.err.msg); for (const token of ["<b:skin>", "<b:section", "<b:widget", "data-api-base"]) if (!xml.includes(token)) throw new Error(`Blogger template missing ${token}.`); return "Blogger XML and checksum verified"; }

export async function regenerateChecksums() {
  const checked = await validateExistingExports(); await writeFile(path.join(checked.output, "SHA256SUMS.txt"), checked.manifest.artifacts.map((item) => `${item.sha256}  ${item.name}`).join("\n") + "\n"); return checked;
}

export async function validateBloggerString(xml: string) { const result = XMLValidator.validate(xml); if (result !== true) throw new Error(result.err.msg); return true; }
export function checksumText(value: string | Uint8Array) { return createHash("sha256").update(typeof value === "string" ? strToU8(value) : value).digest("hex"); }
