import { z } from "zod";

/**
 * 环境变量验证（ARCHITECTURE.md 第 16 章）。
 * 启动时验证所有必需变量；生产环境缺少变量时立即退出，不使用不安全默认值。
 */

const boolString = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET 至少 16 个字符"),
  TRUSTED_ORIGINS: z.string().min(1),
  TZ: z.string().default("Asia/Shanghai"),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  S3_FORCE_PATH_STYLE: boolString,

  MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 1024 * 1024),
  MAX_IMAGE_PIXELS: z.coerce.number().int().positive().default(40_000_000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

const isProduction = process.env.NODE_ENV === "production";

/**
 * 校验并缓存环境变量。
 * 生产环境校验失败时打印错误并退出进程。
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env] 环境变量校验失败:\n${issues}`);
    if (isProduction) {
      process.exit(1);
    }
    throw new Error(`环境变量校验失败:\n${issues}`);
  }
  return result.data;
}

export const env: Env = loadEnv();

/** 允许的来源列表（用于 Origin/CSRF 校验） */
export const trustedOrigins: string[] = env.TRUSTED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
