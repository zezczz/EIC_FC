import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";
import { env } from "@/server/env";
import type { Role, UserStatus } from "@/generated/prisma/enums";
import type { StaffTitle } from "@/generated/prisma/enums";
import type { Permission } from "@/server/auth/permissions";

/**
 * 数据库会话（ARCHITECTURE.md §7.2、§15.1）。
 * Cookie 保存原始 token；数据库只保存 HMAC(AUTH_SECRET, token)。
 * Cookie: HttpOnly、生产环境 Secure、SameSite=Lax。
 */

export const SESSION_COOKIE = "eicfc_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 天

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  staffTitle?: StaffTitle | null;
  permissions?: Permission[];
  status: UserStatus;
  reviewReason: string | null;
  avatarUrl?: string | null;
};

function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 对原始 token 做 HMAC，仅存哈希到数据库 */
export function hashSessionToken(rawToken: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(rawToken).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** 创建会话并写入 cookie，返回原始 session token */
export async function createSession(userId: string): Promise<string> {
  const rawToken = createSessionToken();
  const hashed = hashSessionToken(rawToken);
  await db.session.create({
    data: {
      sessionToken: hashed,
      userId,
      expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    },
  });
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, rawToken, sessionCookieOptions());
  } catch {
    // 非请求上下文（脚本/集成测试）仅写入数据库会话
  }
  return rawToken;
}

/** 从 cookie 读取当前会话用户；无效/过期/停用返回 null */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  let rawToken: string | undefined;
  try {
    const cookieStore = await cookies();
    rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  } catch {
    return null;
  }
  if (!rawToken) return null;

  const hashed = hashSessionToken(rawToken);
  const session = await db.session.findUnique({
    where: { sessionToken: hashed },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          reviewReason: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session || session.expires < new Date() || session.user.deletedAt) {
    return null;
  }
  // SUSPENDED 用户不得通过会话访问（已有会话立即失效）
  if (session.user.status === "SUSPENDED") {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role,
    status: session.user.status,
    reviewReason: session.user.reviewReason,
  };
});

/** 销毁当前会话（退出登录） */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (rawToken) {
      const hashed = hashSessionToken(rawToken);
      await db.session.deleteMany({ where: { sessionToken: hashed } });
      cookieStore.delete(SESSION_COOKIE);
    }
  } catch {
    // 非请求上下文忽略 cookie
  }
}

/** 撤销某用户全部会话（停用/拒绝/角色变化后调用） */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

/** 撤销除指定原始 token 外的全部会话 */
export async function revokeOtherSessions(
  userId: string,
  keepRawToken: string,
): Promise<void> {
  const keepHash = hashSessionToken(keepRawToken);
  await db.session.deleteMany({
    where: { userId, sessionToken: { not: keepHash } },
  });
}

/** 生成身份哈希（供限流/审计复用） */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
