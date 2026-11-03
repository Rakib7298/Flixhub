import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128).refine((value) => new Set(value).size >= 4, "Password is too repetitive.");
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Use 3–30 lowercase letters, numbers, or underscores.");

export const registerSchema = z.object({ email: emailSchema, username: usernameSchema, password: passwordSchema, name: z.string().trim().min(1).max(80).optional() });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const recoverySchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ email: emailSchema, token: z.string().length(64), password: passwordSchema });
export const preferenceSchema = z.object({
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  language: z.string().trim().toLowerCase().regex(/^[a-z]{2}(-[a-z]{2})?$/).optional(),
  autoplay: z.boolean().optional(), dataSaver: z.boolean().optional(), reducedMotion: z.boolean().optional(),
}).strict();

export const watchlistSchema = z.object({
  action: z.enum(["add", "remove"]),
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300).optional(),
  posterPath: z.string().max(300).regex(/^\//).nullable().optional(),
});

export const favoriteSchema = z.object({
  action: z.enum(["add", "remove"]),
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300).optional(),
  posterPath: z.string().max(300).regex(/^\//).nullable().optional(),
});

export const historySchema = z.object({
  mediaKey: z.string().regex(/^(movie|tv|episode|channel|jellyfin):[a-zA-Z0-9_-]+$/).max(150),
  title: z.string().trim().min(1).max(300),
});

export const progressSchema = z.object({
  mediaKey: z.string().regex(/^(movie|tv|episode|channel|jellyfin):[a-zA-Z0-9_-]+$/).max(150),
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().max(300).regex(/^\//).nullable().optional(),
  seconds: z.number().finite().min(0).max(100_000),
  duration: z.number().finite().min(0).max(100_000),
});
