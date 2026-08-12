import { db } from "@/server/db";
import { errForbidden, errUnauthorized } from "@/server/errors";
import { getSessionUser, type SessionUser } from "@/server/auth/session";

/**
 * 服务端权限守卫（ARCHITECTURE.md §5.3、§15.1）。
 * 前端隐藏按钮不构成权限控制；每次敏感请求必须从数据库读取当前状态和角色。
 * 这些守卫从数据库重新读取用户状态，避免依赖可能过期的会话快照。
 */

/** 读取会话用户（不抛错，未登录返回 null） */
export async function requireUser(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw errUnauthorized();
  }
  return sessionUser;
}

/** 从数据库重新读取用户当前状态（绕过 React cache 的会话快照） */
async function freshUserStatus(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
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
  });
}

/** 要求已登录且为 ACTIVE（成员区入口） */
export async function requireActiveMember(): Promise<SessionUser> {
  const sessionUser = await requireUser();
  const fresh = await freshUserStatus(sessionUser.id);
  if (!fresh || fresh.deletedAt || fresh.status !== "ACTIVE") {
    throw errForbidden("账号未激活或已被停用");
  }
  return {
    id: fresh.id,
    username: fresh.username,
    email: fresh.email,
    displayName: fresh.displayName,
    role: fresh.role,
    status: fresh.status,
    reviewReason: fresh.reviewReason,
  };
}

/** 要求 ACTIVE CAPTAIN（后台入口） */
export async function requireCaptain(): Promise<SessionUser> {
  const sessionUser = await requireActiveMember();
  if (sessionUser.role !== "CAPTAIN") {
    throw errForbidden("仅队长可执行此操作");
  }
  return sessionUser;
}

/**
 * 最后一名 ACTIVE CAPTAIN 保护：
 * 检查目标用户是否为最后一个可用的 ACTIVE CAPTAIN。
 */
export async function assertNotLastCaptain(
  targetUserId: string,
): Promise<void> {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, status: true },
  });
  if (!target || target.role !== "CAPTAIN" || target.status !== "ACTIVE") {
    return;
  }
  const activeCaptains = await db.user.count({
    where: { role: "CAPTAIN", status: "ACTIVE", deletedAt: null },
  });
  if (activeCaptains <= 1) {
    throw errForbidden("不能停用、删除或降级最后一名 ACTIVE 队长");
  }
}
