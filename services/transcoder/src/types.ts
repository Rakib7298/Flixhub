export type TranscoderJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface TranscodeRequest {
  inputUrl: string;
  authorizationConfirmed: true;
  thumbnail?: boolean;
  preset?: "veryfast" | "faster" | "fast";
  crf?: number;
}

export interface TranscoderJob {
  id: string;
  status: TranscoderJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  outputs?: { playlist?: string; thumbnail?: string };
}
