import { db } from "@/server/db";
import { hashIp } from "@/server/rate-limit";

/**
 * 审计日志（ARCHITECTURE.md §7.7、§21）。
 * 只允许追加。必须过滤密码、密码哈希、Cookie、Token、对象存储密钥和完整个人联系方式。
 */

/** 从字段中移除敏感键 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "confirmPassword",
  "sessionToken",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "cookie",
  "authorization",
  "secret",
  "secretAccessKey",
  "accessKeyId",
  "email",
  "emailNormalized",
  "phone",
  "mobile",
]);

export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v));
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export type AuditInput = {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

/** 写入审计日志（追加，不更新） */
export async function writeAudit(input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: input.before === undefined ? undefined : (redact(input.before) as object),
      after: input.after === undefined ? undefined : (redact(input.after) as object),
      reason: input.reason ?? null,
      requestId: input.requestId,
      ipHash: input.ip ? hashIp(input.ip) : null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    },
  });
}

export async function listAuditLogs(input: {
  cursor?: string;
  limit: number;
  resourceType?: string;
  action?: string;
}) {
  const rows = await db.auditLog.findMany({
    where: {
      ...(input.resourceType ? { resourceType: input.resourceType } : {}),
      ...(input.action ? { action: input.action } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    select: {
      id: true,
      action: true,
      resourceType: true,
      resourceId: true,
      reason: true,
      requestId: true,
      createdAt: true,
      actor: { select: { id: true, displayName: true, username: true } },
    },
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}
