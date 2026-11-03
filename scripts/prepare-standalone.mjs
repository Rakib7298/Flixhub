import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(root, "apps/web");
const standaloneApp = path.join(app, ".next/standalone/apps/web");
await mkdir(path.join(standaloneApp, ".next"), { recursive: true });
await cp(path.join(app, ".next/static"), path.join(standaloneApp, ".next/static"), { recursive: true });
await cp(path.join(app, "public"), path.join(standaloneApp, "public"), { recursive: true });
console.log("Standalone static and public assets prepared.");
