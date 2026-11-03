import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hlsArguments } from "../../services/transcoder/src/ffmpeg";
import { JobStore } from "../../services/transcoder/src/store";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("transcoder helpers", () => {
  it("builds fixed argument arrays without shell interpolation", () => {
    const args = hlsArguments("/tmp/authorized.input", "/tmp/job", "veryfast", 23);
    expect(args).toContain("libx264"); expect(args).toContain(path.join("/tmp/job", "segment_%05d.ts")); expect(args.at(-1)).toBe("/tmp/job/index.m3u8");
    expect(args).not.toContain("&&"); expect(args).not.toContain("sh");
  });
  it("persists non-sensitive job status across store restarts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mediamatrix-job-store-")); directories.push(root);
    const store = new JobStore(root); await store.init(); const job = store.create(); store.update(job.id, { status: "COMPLETED", progress: 100, outputs: { playlist: `jobs/${job.id}/index.m3u8` } }); await store.flush();
    const restored = new JobStore(root); await restored.init(); expect(restored.get(job.id)).toMatchObject({ status: "COMPLETED", progress: 100 }); expect(JSON.stringify(restored.get(job.id))).not.toContain("http");
  });
});
