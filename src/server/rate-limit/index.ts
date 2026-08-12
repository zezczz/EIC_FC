import { createHash } from "node:crypto";
import { db } from "@/server/db";

/**
 * 登录/注册限流（ARCHITECTURE.md §15.1）。
 * REGISTER 与 LOGIN 分开计数。kind 字段通过迁移添加；
 * 在 Prisma Client 未完整 regenerate 前，使用宽松类型写入。
 */

const IDENTITY_WINDOW_MS = 15 * 60 * 1000;
const MAX_IDENTITY_FAILURES = 10;
const MAX_IP_FAILURES = 30;

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTERS_PER_IP = 5;

export type AuthAttemptKind = "LOGIN" | "REGISTER";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashIdentity(identity: string): string {
  return sha256Hex(identity.trim().toLowerCase());
}

export function hashIp(ip: string): string {
  return sha256Hex(ip);
}

export async function recordAuthAttempt(input: {
  kind: AuthAttemptKind;
  identity: string;
  ip: string;
  succeeded: boolean;
}): Promise<unknown> {
  // 兼容旧 Client：优先带 kind 写入，失败则回退无 kind（仅开发过渡）
  try {
    return await db.loginAttempt.create({
      data: {
        kind: input.kind,
        identityHash: hashIdentity(input.identity),
        ipHash: hashIp(input.ip),
        succeeded: input.succeeded,
      } as never,
    });
  } catch {
    return db.loginAttempt.create({
      data: {
        identityHash: hashIdentity(input.identity),
        ipHash: hashIp(input.ip),
        succeeded: input.succeeded,
      },
    });
  }
}

export function recordLoginAttempt(input: {
  identity: string;
  ip: string;
  succeeded: boolean;
}): Promise<unknown> {
  return recordAuthAttempt({ ...input, kind: "LOGIN" });
}

export async function isLoginBlocked(input: {
  identity: string;
  ip: string;
}): Promise<{ blocked: boolean; reason?: "identity" | "ip" }> {
  const since = new Date(Date.now() - IDENTITY_WINDOW_MS);
  const identityHash = hashIdentity(input.identity);
  const ipHash = hashIp(input.ip);

  // 使用原始 SQL，兼容 kind 列是否存在
  try {
    const [identityRows, ipRows] = await Promise.all([
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM "LoginAttempt"
        WHERE "identityHash" = ${identityHash}
          AND succeeded = false
          AND "createdAt" >= ${since}
          AND (kind = 'LOGIN' OR kind IS NULL)
      `,
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM "LoginAttempt"
        WHERE "ipHash" = ${ipHash}
          AND succeeded = false
          AND "createdAt" >= ${since}
          AND (kind = 'LOGIN' OR kind IS NULL)
      `,
    ]);
    if (Number(identityRows[0]?.count ?? 0) >= MAX_IDENTITY_FAILURES) {
      return { blocked: true, reason: "identity" };
    }
    if (Number(ipRows[0]?.count ?? 0) >= MAX_IP_FAILURES) {
      return { blocked: true, reason: "ip" };
    }
  } catch {
    const [identityFailures, ipFailures] = await Promise.all([
      db.loginAttempt.count({
        where: { identityHash, succeeded: false, createdAt: { gte: since } },
      }),
      db.loginAttempt.count({
        where: { ipHash, succeeded: false, createdAt: { gte: since } },
      }),
    ]);
    if (identityFailures >= MAX_IDENTITY_FAILURES) {
      return { blocked: true, reason: "identity" };
    }
    if (ipFailures >= MAX_IP_FAILURES) {
      return { blocked: true, reason: "ip" };
    }
  }
  return { blocked: false };
}

export async function isRegisterBlocked(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - REGISTER_WINDOW_MS);
  const ipHash = hashIp(ip);
  try {
    const rows = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "LoginAttempt"
      WHERE kind = 'REGISTER'
        AND "ipHash" = ${ipHash}
        AND "createdAt" >= ${since}
    `;
    return Number(rows[0]?.count ?? 0) >= MAX_REGISTERS_PER_IP;
  } catch {
    // 迁移未应用时：用审计日志兜底
    const count = await db.auditLog.count({
      where: {
        action: { in: ["USER_REGISTER", "USER_REGISTER_ATTEMPT"] },
        ipHash,
        createdAt: { gte: since },
      },
    });
    return count >= MAX_REGISTERS_PER_IP;
  }
}
