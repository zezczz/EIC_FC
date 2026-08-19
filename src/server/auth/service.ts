import { db } from "@/server/db";
import { errConflict, errUnauthorized, AppError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getSessionUser } from "@/server/auth/session";
import { isLoginBlocked, isRegisterBlocked, recordAuthAttempt } from "@/server/rate-limit";
import { writeAudit } from "@/server/audit";
import type { LoginInput, RegisterInput } from "@/schemas/auth";

/**
 * 认证服务（ARCHITECTURE.md §5、§15.1）。
 * 注册后为 PENDING 并自动建立会话；登录使用模糊错误提示。
 */

function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase("zh-CN");
}

/** 注册新用户，创建 PENDING 会话后返回用户 */
export async function registerUser(input: RegisterInput, ip: string) {
  const username = input.username.trim();
  const usernameNormalized = normalizeUsername(username);
  const email = input.email.trim().toLowerCase();
  const emailNormalized = email.toLowerCase();

  if (await isRegisterBlocked(ip)) {
    throw new AppError("RATE_LIMITED", "注册过于频繁，请稍后再试");
  }

  const existing = await db.user.findFirst({
    where: {
      OR: [{ usernameNormalized }, { emailNormalized }, { username }, { email }],
    },
    select: { usernameNormalized: true, emailNormalized: true },
  });
  if (existing) {
    await recordAuthAttempt({
      kind: "REGISTER",
      identity: emailNormalized,
      ip,
      succeeded: false,
    });
    if (existing.usernameNormalized === usernameNormalized) {
      throw errConflict("该用户名已被使用");
    }
    throw errConflict("该邮箱已被注册");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      username,
      usernameNormalized,
      email,
      emailNormalized,
      passwordHash,
      displayName: input.displayName.trim(),
      applicationMessage: input.applicationMessage?.trim() || null,
      status: "PENDING",
      role: "MEMBER",
    },
  });

  await recordAuthAttempt({
    kind: "REGISTER",
    identity: emailNormalized,
    ip,
    succeeded: true,
  });

  // 注册成功后建立 PENDING 会话，便于查看审核状态
  await createSession(user.id);
  return user;
}

/** 登录：成功创建数据库会话并写 cookie；失败模糊提示 */
export async function loginUser(input: LoginInput, ip: string) {
  const blocked = await isLoginBlocked({ identity: input.identity, ip });
  if (blocked.blocked) {
    throw new AppError("RATE_LIMITED", "尝试次数过多，请稍后再试");
  }

  const identity = input.identity.trim();
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: identity },
        { usernameNormalized: normalizeUsername(identity) },
        { email: identity },
        { emailNormalized: identity.toLowerCase() },
      ],
    },
  });

  // 用户不存在时仍做 dummy verify，缓解计时侧信道
  const dummyHash =
    "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? dummyHash);

  if (!user || !passwordOk) {
    await recordAuthAttempt({ kind: "LOGIN", identity, ip, succeeded: false });
    throw errUnauthorized("用户名或密码错误");
  }

  if (user.deletedAt) {
    await recordAuthAttempt({ kind: "LOGIN", identity, ip, succeeded: false });
    throw errUnauthorized("用户名或密码错误");
  }

  await recordAuthAttempt({ kind: "LOGIN", identity, ip, succeeded: true });

  if (user.status === "SUSPENDED") {
    throw errUnauthorized("账号已被停用，请联系队长");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(user.id);
  return user;
}

export async function signOutUser() {
  const sessionUser = await getSessionUser();
  await destroySession();
  return sessionUser;
}

export async function assertRegisterAllowed(ip: string): Promise<void> {
  if (await isRegisterBlocked(ip)) {
    throw new AppError("RATE_LIMITED", "注册过于频繁，请稍后再试");
  }
}

export function userAuditPayload(user: { id: string; username: string }) {
  return {
    id: user.id,
    username: user.username,
  };
}

export async function auditLogin(
  user: { id: string; username: string } | null,
  requestId: string,
  ip: string,
) {
  if (user) {
    await writeAudit({
      actorId: user.id,
      action: "USER_LOGIN",
      resourceType: "USER",
      resourceId: user.id,
      requestId,
      ip,
    });
  }
}
