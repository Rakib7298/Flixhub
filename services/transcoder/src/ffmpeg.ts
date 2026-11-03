import { execFile } from "node:child_process";
import { spawn, type ChildProcess } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function probeMedia(input: string): Promise<{ duration: number; hasVideo: boolean }> {
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", input], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
  const metadata = JSON.parse(stdout) as { format?: { duration?: string }; streams?: Array<{ codec_type?: string }> };
  const duration = Number(metadata.format?.duration || 0);
  if (!metadata.streams?.some((stream) => stream.codec_type === "video")) throw new Error("The input has no supported video stream.");
  return { duration: Number.isFinite(duration) ? duration : 0, hasVideo: true };
}

export function hlsArguments(input: string, jobDirectory: string, preset: "veryfast" | "faster" | "fast", crf: number): string[] {
  return ["-hide_banner", "-nostdin", "-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-c:a", "aac", "-b:a", "128k", "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_segment_filename", path.join(jobDirectory, "segment_%05d.ts"), "-progress", "pipe:1", "-nostats", path.join(jobDirectory, "index.m3u8")];
}

export async function transcodeHls(input: string, jobDirectory: string, options: { preset: "veryfast" | "faster" | "fast"; crf: number; duration: number; signal: AbortSignal; onProcess: (process: ChildProcess) => void; onProgress: (progress: number) => void }) {
  const child = spawn("ffmpeg", hlsArguments(input, jobDirectory, options.preset, options.crf), { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  options.onProcess(child);
  let stderr = ""; let buffered = "";
  child.stderr.on("data", (chunk: Buffer) => { stderr = `${stderr}${chunk.toString()}`.slice(-4000); });
  child.stdout.on("data", (chunk: Buffer) => {
    buffered += chunk.toString(); const lines = buffered.split(/\r?\n/); buffered = lines.pop() || "";
    for (const line of lines) {
      const [key, value] = line.split("=", 2);
      if (key === "out_time_ms" && options.duration > 0) {
        const seconds = Number(value) / 1_000_000;
        if (Number.isFinite(seconds)) options.onProgress(Math.min(95, Math.max(1, Math.round(seconds / options.duration * 95))));
      }
    }
  });
  let closed = false; child.once("close", () => { closed = true; });
  const abort = () => { child.kill("SIGTERM"); setTimeout(() => { if (!closed) child.kill("SIGKILL"); }, 5000).unref(); };
  options.signal.addEventListener("abort", abort, { once: true });
  try {
    const code = await new Promise<number>((resolve, reject) => { child.once("error", reject); child.once("close", (code) => resolve(code ?? 1)); });
    if (options.signal.aborted) throw new Error("Transcoding was cancelled or timed out.");
    if (code !== 0) throw new Error(`FFmpeg exited with code ${code}. ${stderr.slice(-300).replace(/[\r\n]+/g, " ")}`);
    const playlist = path.join(jobDirectory, "index.m3u8");
    if ((await stat(playlist)).size < 20 || !(await readdir(jobDirectory)).some((name) => name.endsWith(".ts"))) throw new Error("FFmpeg did not produce verifiable HLS output.");
  } finally { options.signal.removeEventListener("abort", abort); }
}

export async function createThumbnail(input: string, jobDirectory: string, signal: AbortSignal) {
  if (signal.aborted) throw new Error("Job cancelled.");
  await execFileAsync("ffmpeg", ["-hide_banner", "-nostdin", "-y", "-ss", "5", "-i", input, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "3", path.join(jobDirectory, "thumbnail.jpg")], { timeout: 60_000, maxBuffer: 1024 * 1024, windowsHide: true });
  if ((await stat(path.join(jobDirectory, "thumbnail.jpg"))).size < 100) throw new Error("Thumbnail verification failed.");
}
