import path from "node:path";
import type { ChildProcess } from "node:child_process";
import { downloadAuthorizedInput } from "./download";
import { createThumbnail, probeMedia, transcodeHls } from "./ffmpeg";
import { JobStore } from "./store";
import type { TranscodeRequest, TranscoderJob } from "./types";

export class Transcoder {
  readonly store: JobStore;
  private readonly requests = new Map<string, TranscodeRequest>();
  private readonly queue: string[] = [];
  private readonly controllers = new Map<string, AbortController>();
  private readonly cancelled = new Set<string>();
  private active = 0;
  constructor(readonly root: string, private readonly options: { maxBytes: number; timeoutMs: number; maxConcurrent: number; allowPrivateNetwork: boolean }) { this.store = new JobStore(root); }
  async init() { await this.store.init(); }

  submit(request: TranscodeRequest): TranscoderJob {
    this.store.assertHealthy();
    if (this.queue.length + this.active >= 20) throw new Error("The transcoder queue is full.");
    const job = this.store.create(); this.requests.set(job.id, request); this.queue.push(job.id); this.pump(); return job;
  }

  cancel(id: string): TranscoderJob {
    const job = this.store.get(id); if (!job) throw new Error("Job not found.");
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) return job;
    this.cancelled.add(id); const queued = this.queue.indexOf(id);
    if (queued >= 0) { this.queue.splice(queued, 1); this.requests.delete(id); this.store.update(id, { status: "CANCELLED", finishedAt: new Date().toISOString() }); }
    this.controllers.get(id)?.abort(); return this.store.get(id)!;
  }

  private pump() {
    while (this.active < this.options.maxConcurrent && this.queue.length) {
      const id = this.queue.shift()!; this.active++; void this.run(id).finally(() => { this.active--; this.controllers.delete(id); this.requests.delete(id); this.pump(); });
    }
  }

  private async run(id: string) {
    const request = this.requests.get(id); if (!request) return;
    const controller = new AbortController(); this.controllers.set(id, controller);
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const jobDirectory = path.join(this.root, "jobs", id);
    try {
      this.store.update(id, { status: "RUNNING", startedAt: new Date().toISOString(), progress: 1 });
      const downloaded = await downloadAuthorizedInput(request.inputUrl, jobDirectory, { maxBytes: this.options.maxBytes, allowPrivateNetwork: this.options.allowPrivateNetwork, signal: controller.signal });
      this.store.update(id, { progress: 5 });
      const probe = await probeMedia(downloaded.path);
      let lastProgress = 0;
      await transcodeHls(downloaded.path, jobDirectory, { preset: request.preset ?? "veryfast", crf: request.crf ?? 23, duration: probe.duration, signal: controller.signal, onProcess: (_process: ChildProcess) => undefined, onProgress: (progress) => { if (Date.now() - lastProgress > 1000) { lastProgress = Date.now(); this.store.update(id, { progress }); } } });
      const outputs: { playlist?: string; thumbnail?: string } = { playlist: `jobs/${id}/index.m3u8` };
      if (request.thumbnail) { await createThumbnail(downloaded.path, jobDirectory, controller.signal); outputs.thumbnail = `jobs/${id}/thumbnail.jpg`; }
      this.store.update(id, { status: "COMPLETED", progress: 100, outputs, finishedAt: new Date().toISOString() });
    } catch (error) {
      if (this.cancelled.has(id)) this.store.update(id, { status: "CANCELLED", finishedAt: new Date().toISOString(), error: "Job cancelled by an authorized request." });
      else this.store.update(id, { status: "FAILED", finishedAt: new Date().toISOString(), error: safeJobError(error) });
    } finally { clearTimeout(timeout); this.cancelled.delete(id); }
  }
}

function safeJobError(error: unknown) { return (error instanceof Error ? error.message : "Transcoding failed").replace(/https?:\/\/[^\s]+/gi, "[source]").replace(/\/[^\s]+\.input/g, "[input]").slice(0, 500); }
