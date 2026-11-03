"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Hls from "hls.js";
import { AlertCircle, Loader2, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { detectPlaybackFormat, playableSourceError, playbackErrorMessage } from "@mediamatrix/media-engine";
import { Button, cn } from "@mediamatrix/ui";

interface VideoPlayerProps { source: string; title: string; mediaKey: string; posterPath?: string | null; autoPlay?: boolean; direct?: boolean }

export function VideoPlayer({ source, title, mediaKey, posterPath, autoPlay = false, direct = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<{ destroy: () => void } | null>(null);
  const lastProgress = useRef(0);
  const latestProgress = useRef({ seconds: 0, duration: 0 });
  const resumeSeconds = useRef(0);
  const { data: session } = useSession();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const saveProgress = useCallback((keepalive = false) => {
    if (!session?.user || !latestProgress.current.duration) return;
    void fetch("/api/user/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaKey, title, posterPath, ...latestProgress.current }), keepalive }).catch(() => undefined);
  }, [session?.user, mediaKey, title, posterPath]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const invalid = playableSourceError(source);
    if (invalid) { setError(invalid); setLoading(false); return; }
    let cancelled = false;
    setError(""); setLoading(true); setPlaying(false); setSeconds(0); setDuration(0);
    const format = detectPlaybackFormat(source);
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (format === "dash") {
      void import("dashjs").then(({ MediaPlayer }) => {
        if (cancelled) return;
        const player = MediaPlayer().create();
        dashRef.current = player;
        player.initialize(video, source, autoPlay);
        player.on("error", () => { if (!cancelled) { setError("The DASH stream could not be loaded. Check its authorization, codec, and CORS policy."); setLoading(false); } });
      }).catch(() => { if (!cancelled) { setError("The DASH playback engine could not be loaded."); setLoading(false); } });
    } else if (!direct && (format === "hls" || format === "unknown") && !nativeHls && Hls.isSupported()) {
      let recovered = false;
      const hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 30, manifestLoadingTimeOut: 15_000, liveSyncDurationCount: 3 });
      hlsRef.current = hls;
      hls.loadSource(source); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (!cancelled) { setLoading(false); if (autoPlay) void video.play().catch(() => undefined); } });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || cancelled) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) { recovered = true; hls.recoverMediaError(); return; }
        setError(data.type === Hls.ErrorTypes.NETWORK_ERROR ? "The stream could not be reached. It may be offline, unauthorized, or blocked by its CORS policy." : "This stream uses an unsupported or damaged media format."); setLoading(false);
      });
    } else {
      video.src = source;
      if (autoPlay) void video.play().catch(() => setLoading(false));
    }
    return () => {
      cancelled = true;
      saveProgress(true);
      hlsRef.current?.destroy(); hlsRef.current = null;
      dashRef.current?.destroy(); dashRef.current = null;
      video.removeAttribute("src"); video.load();
    };
  }, [source, autoPlay, retry, saveProgress, direct]);

  const applyResumePosition = useCallback(() => {
    const video = videoRef.current; const target = resumeSeconds.current;
    if (!video || target < 5 || !Number.isFinite(video.duration) || target >= video.duration - 5) return;
    video.currentTime = target; resumeSeconds.current = 0;
  }, []);

  useEffect(() => {
    resumeSeconds.current = 0;
    if (!session?.user) return;
    let cancelled = false;
    void fetch("/api/user/progress", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data: { items?: Array<{ mediaKey: string; seconds: number }> } | null) => {
      if (cancelled || !data?.items) return;
      const progress = data.items.find((item) => item.mediaKey === mediaKey);
      if (progress?.seconds) { resumeSeconds.current = progress.seconds; applyResumePosition(); }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [session?.user, mediaKey, applyResumePosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => { setPlaying(true); setLoading(false); };
    const onPause = () => { setPlaying(false); saveProgress(); };
    const onTime = () => {
      const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      const total = Number.isFinite(video.duration) ? video.duration : 0;
      setSeconds(current); setDuration(total); latestProgress.current = { seconds: current, duration: total };
      if (Date.now() - lastProgress.current > 15_000) { lastProgress.current = Date.now(); saveProgress(); }
    };
    const onWaiting = () => setLoading(true);
    const onReady = () => setLoading(false);
    const onError = () => { if (video.error) { setError(playbackErrorMessage(video.error.message)); setLoading(false); } };
    const onEnded = () => saveProgress();
    const onMetadata = () => { onTime(); applyResumePosition(); };
    video.addEventListener("play", onPlay); video.addEventListener("pause", onPause); video.addEventListener("timeupdate", onTime); video.addEventListener("waiting", onWaiting); video.addEventListener("canplay", onReady); video.addEventListener("loadedmetadata", onMetadata); video.addEventListener("error", onError); video.addEventListener("ended", onEnded);
    return () => { video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause); video.removeEventListener("timeupdate", onTime); video.removeEventListener("waiting", onWaiting); video.removeEventListener("canplay", onReady); video.removeEventListener("loadedmetadata", onMetadata); video.removeEventListener("error", onError); video.removeEventListener("ended", onEnded); };
  }, [saveProgress, applyResumePosition]);

  useEffect(() => {
    if (!playing || !session?.user) return;
    const timer = setTimeout(() => {
      void fetch("/api/user/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaKey, title }) }).catch(() => undefined);
    }, 30_000);
    return () => clearTimeout(timer);
  }, [playing, session?.user, mediaKey, title]);

  async function togglePlay() { const video = videoRef.current; if (!video) return; if (video.paused) { try { await video.play(); } catch { setError("Playback could not start. Your browser may have blocked autoplay or rejected this format."); } } else video.pause(); }
  function seek(value: number) { if (videoRef.current && Number.isFinite(duration)) videoRef.current.currentTime = value; }
  function changeVolume(value: number) { if (!videoRef.current) return; videoRef.current.volume = value; videoRef.current.muted = value === 0; setVolume(value); setMuted(value === 0); }
  async function fullscreen() { try { await containerRef.current?.requestFullscreen(); } catch { setError("Fullscreen is not available in this browser context."); } }

  return <div ref={containerRef} className="group/player relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40"><video ref={videoRef} className="aspect-video w-full bg-black" playsInline preload="metadata" aria-label={title} onClick={togglePlay} />{loading && !error && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"><Loader2 className="animate-spin text-white" size={32} /><span className="sr-only">Loading stream</span></div>}{error && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center"><AlertCircle className="mb-3 text-red-400" size={30} /><p className="max-w-md text-sm leading-6 text-zinc-300">{error}</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => setRetry((value) => value + 1)}><RotateCcw size={14} />Retry authorized source</Button></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-10 transition sm:p-4 sm:pt-12"><div className="mb-2 flex items-center gap-3">{duration > 0 && <><span className="w-10 text-right text-[10px] tabular-nums text-zinc-400">{formatTime(seconds)}</span><input type="range" min={0} max={duration} step={0.1} value={Math.min(seconds, duration)} onChange={(event) => seek(Number(event.target.value))} className="h-1 flex-1 cursor-pointer accent-red-600" aria-label="Playback position" /><span className="w-10 text-[10px] tabular-nums text-zinc-400">{formatTime(duration)}</span></>}</div><div className="flex items-center gap-1 sm:gap-2"><button onClick={togglePlay} className="control" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={19} /> : <Play size={19} className="fill-current" />}</button><button onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } }} className="control" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => changeVolume(Number(event.target.value))} className="hidden h-1 w-20 accent-white min-[420px]:block" aria-label="Volume" /><p className="ml-2 min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">{title}</p><button onClick={fullscreen} className="control" aria-label="Fullscreen"><Maximize size={18} /></button></div></div><style jsx>{`.control{display:inline-flex;height:2.5rem;width:2.5rem;align-items:center;justify-content:center;border-radius:9999px;color:#e4e4e7;transition:background .2s}.control:hover{background:rgba(255,255,255,.12);color:white}`}</style></div>;
}

function formatTime(value: number) { const total = Math.max(0, Math.floor(value)); const hours = Math.floor(total / 3600); const minutes = Math.floor((total % 3600) / 60); const seconds = total % 60; return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`; }

export function PlayerStatus({ live }: { live?: boolean }) { return <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400")}><span className={cn("h-1.5 w-1.5 rounded-full", live ? "animate-pulse bg-red-500" : "bg-zinc-600")} />{live ? "Live source" : "On demand"}</span>; }
