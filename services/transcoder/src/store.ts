import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TranscoderJob } from "./types";

export class JobStore {
  private readonly jobs = new Map<string, TranscoderJob>();
  private writeChain: Promise<void> = Promise.resolve();
  private persistenceFailed = false;
  constructor(private readonly root: string) {}

  get healthy() { return !this.persistenceFailed; }
  assertHealthy() { if (this.persistenceFailed) throw new Error("Job status persistence is unavailable; new jobs are rejected."); }
  async flush() { await this.writeChain; }

  async init() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    try {
      const records = JSON.parse(await readFile(this.file, "utf8")) as TranscoderJob[];
      if (!Array.isArray(records)) throw new Error("Invalid job store");
      for (const job of records.slice(-1000)) {
        if (!job || typeof job.id !== "string" || !/^[a-f0-9-]{36}$/.test(job.id)) continue;
        if (["QUEUED", "RUNNING"].includes(job.status)) this.jobs.set(job.id, { ...job, status: "FAILED", error: "Worker restarted before this job completed.", finishedAt: new Date().toISOString() });
        else this.jobs.set(job.id, job);
      }
      await this.persist();
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
      throw new Error("The transcoder job store is unreadable. Move or repair jobs.json before restarting.");
    }
  }

  create(): TranscoderJob {
    const now = new Date().toISOString();
    const job: TranscoderJob = { id: randomUUID(), status: "QUEUED", progress: 0, createdAt: now, updatedAt: now };
    this.jobs.set(job.id, job); void this.persist(); return job;
  }

  update(id: string, update: Partial<TranscoderJob>): TranscoderJob {
    const current = this.jobs.get(id); if (!current) throw new Error("Job not found.");
    const next = { ...current, ...update, id, updatedAt: new Date().toISOString() };
    this.jobs.set(id, next); void this.persist(); return next;
  }

  get(id: string) { return this.jobs.get(id); }
  list() { return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200); }
  private get file() { return path.join(this.root, "jobs.json"); }
  private persist() {
    this.writeChain = this.writeChain.then(async () => {
      const temporary = `${this.file}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(this.list(), null, 2), { mode: 0o600 });
      await rename(temporary, this.file);
    });
    void this.writeChain.catch(() => { this.persistenceFailed = true; console.error("Transcoder job status persistence failed; subsequent jobs will be rejected."); });
    return this.writeChain;
  }
}
