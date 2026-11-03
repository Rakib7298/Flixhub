import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin-header";
import { TranscodingManager } from "@/components/transcoding-manager";

export const metadata: Metadata = { title: "Transcoding" };
export default function AdminTranscodingPage() { return <><AdminHeader eyebrow="Optional FFmpeg worker" title="Transcoding jobs" description="Submit and monitor authorized HLS transcoding on an independently deployed worker. Worker-local output paths are not public playback URLs." /><TranscodingManager /></>; }
