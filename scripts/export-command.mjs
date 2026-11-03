import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function runExportCommand(mode) {
  const result = spawnSync(process.execPath, ["--import", "tsx", path.join(root, "scripts/export-runner.ts"), mode], { cwd: root, stdio: "inherit", env: process.env, timeout: 180_000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
