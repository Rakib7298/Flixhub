import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const booleanString = z.enum(["true", "false"]).default("false").transform((value) => value === "true");

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_TRUST_HOST: booleanString,
  TMDB_API_KEY: z.string().min(1).optional(),
  TMDB_ACCESS_TOKEN: z.string().min(1).optional(),
  TMDB_API_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p"),
  STREAMING_AVAILABILITY_API_KEY: z.string().min(1).optional(),
  STREAMING_API_PROVIDER: z.string().min(1).optional(),
  STREAMING_API_BASE_URL: optionalUrl,
  STREAMING_DEFAULT_COUNTRY: z.string().length(2).default("BD"),
  GITHUB_TOKEN: z.string().min(1).optional(),
  PLAYLIST_MAX_BYTES: z.coerce.number().int().positive().max(50_000_000).default(5_242_880),
  PLAYLIST_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(15_000),
  PLAYLIST_ALLOW_PRIVATE_NETWORK: booleanString,
  REDIS_URL: z.string().min(1).optional(),
  SYNC_CRON_SECRET: z.string().min(32).optional(),
  TRANSCODER_WORKER_URL: optionalUrl,
  TRANSCODER_WORKER_API_KEY: z.string().min(1).optional(),
  SMTP_URL: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).default("MediaMatrix <no-reply@example.com>"),
  JELLYFIN_SERVER_URL: optionalUrl,
  JELLYFIN_API_KEY: z.string().min(1).optional(),
  JELLYFIN_USER_ID: z.string().min(1).optional(),
  JELLYFIN_ALLOW_PRIVATE_NETWORK: booleanString,
  MEDIAMATRIX_EXPORTS_ENABLED: booleanString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = readServerEnv()[key];
  if (value === undefined || value === "") {
    throw new Error(`${String(key)} is required for this feature`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

export function integrationStatus(env: ServerEnv = readServerEnv()) {
  return {
    database: Boolean(env.DATABASE_URL),
    authentication: Boolean(env.AUTH_SECRET),
    tmdb: Boolean(env.TMDB_ACCESS_TOKEN || env.TMDB_API_KEY),
    streamingAvailability: Boolean(env.STREAMING_AVAILABILITY_API_KEY && env.STREAMING_API_PROVIDER),
    passwordRecovery: Boolean(env.SMTP_URL),
    transcoder: Boolean(env.TRANSCODER_WORKER_URL && env.TRANSCODER_WORKER_API_KEY),
    jellyfin: Boolean(env.JELLYFIN_SERVER_URL && env.JELLYFIN_API_KEY && env.JELLYFIN_USER_ID),
    github: Boolean(env.GITHUB_TOKEN),
  };
}
