import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { destroySession, revokeOtherSessions, SESSION_COOKIE } from "@/server/auth/session";
import { AppError, errConflict, errForbidden, errNotFound } from "@/server/errors";
import type { ProfileUpdateInput, PasswordChangeInput } from "@/schemas/account";
import {
  canEditProfileField,
  projectMemberProfile,
  resolveProfilePermissions,
  type MemberProfileRecord,
  type ProfileField,
} from "@/server/users/profile-access";
import { cookies } from "next/headers";

export type ProfileContext = {
  actorId: string;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

async function audit(
  ctx: ProfileContext,
  action: string,
  resourceId: string,
  before?: unknown,
  after?: unknown,
) {
  await writeAudit({
    actorId: ctx.actorId,
    action,
    resourceType: "USER",
    resourceId,
    before,
    after,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

async function assertOwnAvatar(assetId: string, ownerIds: string[]) {
  const asset = await db.mediaAsset.findFirst({
    where: {
      id: assetId,
      uploadedById: { in: ownerIds },
      purpose: "AVATAR",
      status: "READY",
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!asset) throw new AppError("VALIDATION_ERROR", "头像图片不可用");
}

const PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  teamTitle: true,
  staffTitle: true,
  signature: true,
  studentId: true,
  fieldPositions: true,
  preferredFoot: true,
  avatarAssetId: true,
  status: true,
  profilePermissions: true,
  avatarAsset: { select: { storageKey: true, status: true } },
} as const;

function toRecord(user: {
  id: string;
  username: string;
  displayName: string;
  role: "MEMBER" | "STAFF" | "CAPTAIN";
  teamTitle: string | null;
  staffTitle: "COACH" | "VICE_CAPTAIN" | "MANAGER" | null;
  signature: string | null;
  studentId: string | null;
  fieldPositions: string[];
  preferredFoot: "LEFT" | "RIGHT" | "BOTH" | null;
  avatarAssetId: string | null;
  status: string;
  avatarAsset: { storageKey: string; status: string } | null;
}): MemberProfileRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    teamTitle: user.teamTitle,
    staffTitle: user.staffTitle,
    signature: user.signature,
    studentId: user.studentId,
    fieldPositions: user.fieldPositions,
    preferredFoot: user.preferredFoot,
    avatarAssetId: user.avatarAssetId,
    avatarUrl:
      user.avatarAsset?.status === "READY" && user.avatarAsset.storageKey
        ? `/api/media/${user.avatarAsset.storageKey}`
        : null,
    status: user.status,
  };
}

async function getActorRecord(actorId: string, requireActive: boolean) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, profilePermissions: true, status: true, deletedAt: true },
  });
  if (!actor || actor.deletedAt) throw errForbidden("账号不可用");
  if (requireActive && actor.status !== "ACTIVE") throw errForbidden("账号未激活或已被停用");
  if (!["PENDING", "ACTIVE"].includes(actor.status)) throw errForbidden("账号不可用");
  return actor;
}

async function getViewerAccess(actorId: string) {
  return getActorRecord(actorId, true);
}

function assertCanEdit(
  actor: { id: string; role: "MEMBER" | "STAFF" | "CAPTAIN"; profilePermissions: string[] },
  targetId: string,
  field: ProfileField,
) {
  const granted = resolveProfilePermissions({
    role: actor.role,
    profilePermissions: actor.profilePermissions,
  });
  if (!canEditProfileField(granted, field, actor.id === targetId, actor.role)) {
    throw errForbidden(`无权编辑该资料字段：${field}`);
  }
}

export async function updateProfile(
  targetUserId: string,
  input: ProfileUpdateInput,
  ctx: ProfileContext,
) {
  const [target, actor] = await Promise.all([
    db.user.findUnique({
      where: { id: targetUserId },
      select: {
        displayName: true,
        applicationMessage: true,
        avatarAssetId: true,
        signature: true,
        studentId: true,
        fieldPositions: true,
        preferredFoot: true,
        status: true,
        deletedAt: true,
      },
    }),
    getActorRecord(ctx.actorId, false),
  ]);
  if (!target || target.deletedAt) throw errForbidden("用户不存在");
  if (!["PENDING", "ACTIVE"].includes(target.status) && ctx.actorId === targetUserId) {
    throw errForbidden("当前账号状态不可编辑资料");
  }

  const data: {
    displayName?: string;
    applicationMessage?: string | null;
    avatarAssetId?: string | null;
    signature?: string | null;
    studentId?: string | null;
    fieldPositions?: string[];
    preferredFoot?: "LEFT" | "RIGHT" | "BOTH" | null;
  } = {};

  if (input.displayName !== undefined) {
    assertCanEdit(actor, targetUserId, "displayName");
    data.displayName = input.displayName;
  }
  if (input.applicationMessage !== undefined) {
    if (ctx.actorId !== targetUserId || target.status !== "PENDING") {
      throw errForbidden("仅待审核用户可修改申请留言");
    }
    data.applicationMessage = input.applicationMessage;
  }
  if (input.avatarAssetId !== undefined) {
    assertCanEdit(actor, targetUserId, "avatar");
    if (input.avatarAssetId)
      await assertOwnAvatar(input.avatarAssetId, [targetUserId, ctx.actorId]);
    data.avatarAssetId = input.avatarAssetId;
  }
  if (input.signature !== undefined) {
    assertCanEdit(actor, targetUserId, "signature");
    data.signature = input.signature;
  }
  if (input.studentId !== undefined) {
    assertCanEdit(actor, targetUserId, "studentId");
    data.studentId = input.studentId;
  }
  if (input.fieldPositions !== undefined) {
    assertCanEdit(actor, targetUserId, "fieldPositions");
    data.fieldPositions = input.fieldPositions;
  }
  if (input.preferredFoot !== undefined) {
    assertCanEdit(actor, targetUserId, "preferredFoot");
    data.preferredFoot = input.preferredFoot;
  }

  const updated = await db.user.update({
    where: { id: targetUserId },
    data,
    select: PROFILE_SELECT,
  });

  await audit(
    ctx,
    input.avatarAssetId !== undefined ? "USER_AVATAR_UPDATE" : "USER_PROFILE_UPDATE",
    targetUserId,
    {
      displayName: target.displayName,
      applicationMessage: target.applicationMessage,
      avatarAssetId: target.avatarAssetId,
      signature: target.signature,
      studentId: target.studentId,
      fieldPositions: target.fieldPositions,
      preferredFoot: target.preferredFoot,
    },
    {
      displayName: updated.displayName,
      applicationMessage: undefined,
      avatarAssetId: updated.avatarAssetId,
      signature: updated.signature,
      studentId: updated.studentId,
      fieldPositions: updated.fieldPositions,
      preferredFoot: updated.preferredFoot,
    },
  );
  return projectMemberProfile(toRecord(updated), actor);
}

export async function listMembers(actorId: string) {
  const actor = await getViewerAccess(actorId);
  const users = await db.user.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
    select: PROFILE_SELECT,
  });
  return users.map((user) => projectMemberProfile(toRecord(user), actor));
}

export async function getMemberProfile(targetUserId: string, actorId: string) {
  const actor = await getViewerAccess(actorId);
  const user = await db.user.findFirst({
    where: { id: targetUserId, deletedAt: null, status: "ACTIVE" },
    select: PROFILE_SELECT,
  });
  if (!user) throw errNotFound("成员不存在");
  return projectMemberProfile(toRecord(user), actor);
}

export async function changePassword(
  userId: string,
  input: PasswordChangeInput,
  ctx: ProfileContext,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw errForbidden("用户不存在");

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw errConflict("当前密码不正确");

  const passwordHash = await hashPassword(input.newPassword);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  let rawToken: string | undefined;
  try {
    const cookieStore = await cookies();
    rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  } catch {
    rawToken = undefined;
  }
  if (rawToken) {
    await revokeOtherSessions(userId, rawToken);
  } else {
    await destroySession();
  }

  await audit(ctx, "USER_PASSWORD_CHANGE", userId, undefined, { changed: true });
  return { changed: true };
}

export async function createMemberUploadIntent(
  userId: string,
  input: {
    originalName: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    sizeBytes: number;
  },
  ctx: ProfileContext,
) {
  const { createUploadIntent } = await import("@/server/media/service");
  return createUploadIntent(
    { ...input, purpose: "AVATAR" },
    {
      actorId: userId,
      requestId: ctx.requestId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  );
}

export async function completeMemberUpload(userId: string, assetId: string, ctx: ProfileContext) {
  const { completeUpload } = await import("@/server/media/service");
  return completeUpload(assetId, {
    actorId: userId,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}
