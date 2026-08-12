import pino from "pino";
import { env } from "@/server/env";

/**
 * Pino JSON 日志（ARCHITECTURE.md 第 21 章）。
 * 字段: timestamp, level, requestId, method, path, status, durationMs, userId?, errorCode?
 * 禁止记录: 密码/哈希、Cookie/Token、对象存储密钥、完整邮箱/手机号、完整请求体。
 */

const baseLogger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "confirmPassword",
      "cookie",
      "authorization",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "email",
      "*.email",
      "phone",
      "*.phone",
    ],
    censor: "[REDACTED]",
  },
});

export type Logger = typeof baseLogger;

export const logger = baseLogger;
