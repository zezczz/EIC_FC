import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  destroySession,
  revokeOtherSessions,
  SESSION_COOKIE,
} from "@/server/auth/session";
import { AppError, errConflict, errForbidden } from "@/server/errors";
import type { ProfileUpdateInput, PasswordChangeInput } from "@/schemas/account";
import { cookies } from "next/headers";

export type ProfileContext = {
  actorId: string;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

async function audit(ctx: ProfileContext, action: string, before?: unknown, after?: unknown) {
  await writeAudit({
    actorId: ctx.actorId,
    action,
    resourceType: "USER",
    resourceId: ctx.actorId,
    before,
    after,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

async function assertOwnAvatar(assetId: string, userId: string) {
  const asset = await db.mediaAsset.findFirst({
    where: {
      id: assetId,
      uploadedById: userId,
      purpose: "AVATAR",
      status: "READY",
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!asset) throw new AppError("VALIDATION_ERROR", "头像图片不可用");
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
  ctx: ProfileContext,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      applicationMessage: true,
      avatarAssetId: true,
      status: true,
    },
  });
  if (!user) throw errForbidden("用户不存在");

  const data: {
    displayName?: string;
    applicationMessage?: string | null;
    avatarAssetId?: string | null;
  } = {};

  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.applicationMessage !== undefined) {
    if (user.status !== "PENDING") {
      throw errForbidden("仅待审核用户可修改申请留言");
    }
    data.applicationMessage = input.applicationMessage;
  }
  if (input.avatarAssetId !== undefined) {
    if (input.avatarAssetId) await assertOwnAvatar(input.avatarAssetId, userId);
    data.avatarAssetId = input.avatarAssetId;
  }

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      displayName: true,
      applicationMessage: true,
      avatarAssetId: true,
      status: true,
    },
  });

  await audit(
    ctx,
    input.avatarAssetId !== undefined ? "USER_AVATAR_UPDATE" : "USER_PROFILE_UPDATE",
    {
      displayName: user.displayName,
      applicationMessage: user.applicationMessage,
      avatarAssetId: user.avatarAssetId,
    },
    {
      displayName: updated.displayName,
      applicationMessage: updated.applicationMessage,
      avatarAssetId: updated.avatarAssetId,
    },
  );
  return updated;
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

  await audit(ctx, "USER_PASSWORD_CHANGE", undefined, { changed: true });
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
