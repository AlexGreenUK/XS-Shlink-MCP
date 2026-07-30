import { z } from "zod";

const envSchema = z.object({
  SHLINK_BASE_URL: z.string().url(),
  SHLINK_API_KEY: z.string().min(1),
  SHLINK_API_VERSION: z.coerce.number().int().positive().default(3),
  SHLINK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  SHLINK_ALLOW_DESTRUCTIVE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Config = {
  baseUrl: string;
  apiKey: string;
  apiVersion: number;
  timeoutMs: number;
  allowDestructive: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.parse(env);
  return {
    baseUrl: parsed.SHLINK_BASE_URL.replace(/\/+$/, ""),
    apiKey: parsed.SHLINK_API_KEY,
    apiVersion: parsed.SHLINK_API_VERSION,
    timeoutMs: parsed.SHLINK_TIMEOUT_MS,
    allowDestructive: parsed.SHLINK_ALLOW_DESTRUCTIVE,
  };
}
