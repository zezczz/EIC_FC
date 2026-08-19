import { db } from "@/server/db";
import { errForbidden, errUnauthorized } from "@/server/errors";
import {
  canAccessCaptainArea,
  hasAnyPermission,
  hasPermission,
  resolveUserPermissions,
  type Permission,
} from "@/server/auth/permissions";
import { getSessionUser, type SessionUser } from "@/server/auth/session";
import type { Role, StaffTitle } from "@/generated/prisma/enums";

export type StaffSessionUser = SessionUser & {
  staffTitle: StaffTitle | null;
  permissions: Permission[];
};

async function freshUserRecord(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      staffTitle: true,
      permissions: true,
      status: true,
      reviewReason: true,
      deletedAt: true,
      avatarAssetId: true,
      avatarAsset: { select: { storageKey: true, status: true } },
    },
  });
}

function toSessionUser(
  fresh: NonNullable<Awaited<ReturnType<typeof freshUserRecord>>>,
): StaffSessionUser {
  const permissions = resolveUserPermissions({
    role: fresh.role,
    staffTitle: fresh.staffTitle,
    permissions: fresh.permissions,
  });
  const avatarUrl =
    fresh.avatarAsset?.status === "READY" && fresh.avatarAsset.storageKey
      ? `/api/media/${fresh.avatarAsset.storageKey}`
      : null;
  return {
    id: fresh.id,
    username: fresh.username,
    email: fresh.email,
    displayName: fresh.displayName,
    role: fresh.role,
    staffTitle: fresh.staffTitle,
    permissions,
    status: fresh.status,
    reviewReason: fresh.reviewReason,
    avatarUrl,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw errUnauthorized();
  return sessionUser;
}

export async function requireProfileEditor(): Promise<StaffSessionUser> {
  const sessionUser = await requireUser();
  const fresh = await freshUserRecord(sessionUser.id);
  if (!fresh || fresh.deletedAt) throw errForbidden("账号不可用");
  if (!["PENDING", "ACTIVE"].includes(fresh.status)) {
    throw errForbidden("当前账号状态不可编辑资料");
  }
  return toSessionUser(fresh);
}

export async function requireActiveMember(): Promise<StaffSessionUser> {
  const sessionUser = await requireUser();
  const fresh = await freshUserRecord(sessionUser.id);
  if (!fresh || fresh.deletedAt || fresh.status !== "ACTIVE") {
    throw errForbidden("账号未激活或已被停用");
  }
  return toSessionUser(fresh);
}

export async function requireCaptain(): Promise<StaffSessionUser> {
  const sessionUser = await requireActiveMember();
  if (sessionUser.role !== "CAPTAIN") {
    throw errForbidden("仅队长可执行此操作");
  }
  return sessionUser;
}

export async function requireStaffAccess(): Promise<StaffSessionUser> {
  const sessionUser = await requireActiveMember();
  if (!canAccessCaptainArea(sessionUser.permissions)) {
    throw errForbidden("无权访问后台");
  }
  return sessionUser;
}

export async function requirePermission(...required: Permission[]): Promise<StaffSessionUser> {
  const sessionUser = await requireStaffAccess();
  if (!hasPermission(sessionUser.permissions, required)) {
    throw errForbidden("无权执行此操作");
  }
  return sessionUser;
}

export async function requireAnyPermission(...required: Permission[]): Promise<StaffSessionUser> {
  const sessionUser = await requireStaffAccess();
  if (!hasAnyPermission(sessionUser.permissions, required)) {
    throw errForbidden("无权执行此操作");
  }
  return sessionUser;
}

export async function assertNotLastCaptain(targetUserId: string): Promise<void> {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, status: true },
  });
  if (!target || target.role !== "CAPTAIN" || target.status !== "ACTIVE") return;
  const activeCaptains = await db.user.count({
    where: { role: "CAPTAIN", status: "ACTIVE", deletedAt: null },
  });
  if (activeCaptains <= 1) {
    throw errForbidden("不能停用、删除或降级最后一名 ACTIVE 队长");
  }
}

export async function getStaffSession(userId: string): Promise<StaffSessionUser | null> {
  const fresh = await freshUserRecord(userId);
  if (!fresh || fresh.deletedAt || fresh.status !== "ACTIVE") return null;
  if (!canAccessCaptainArea(resolveUserPermissions(fresh))) return null;
  return toSessionUser(fresh);
}

export function isCaptainRole(role: Role): boolean {
  return role === "CAPTAIN";
}
