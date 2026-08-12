import { db } from "@/server/db";
import { errConflict, errForbidden, errNotFound } from "@/server/errors";
import { revokeAllSessions } from "@/server/auth/session";
import { writeAudit, type AuditInput } from "@/server/audit";

/**
 * 用户审核服务（ARCHITECTURE.md §5、§6.1、§11.6）。
 */

type UserBrief = {
  id: string;
  username: string;
  status: string;
  role: string;
};

export type ReviewContext = {
  actorId: string;
  requestId: string;
  ip?: string;
  userAgent?: string | null;
};

function auditEntry(ctx: ReviewContext, input: Partial<AuditInput>): AuditInput {
  return {
    actorId: ctx.actorId,
    requestId: ctx.requestId,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
    action: input.action!,
    resourceType: "USER",
    resourceId: input.resourceId!,
    before: input.before,
    after: input.after,
    reason: input.reason,
  };
}

async function getOrThrow(userId: string): Promise<UserBrief> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      status: true,
      role: true,
      deletedAt: true,
    },
  });
  if (!user || user.deletedAt) {
    throw errNotFound("用户不存在");
  }
  return user;
}

export async function approveUser(
  userId: string,
  reviewerId: string,
  ctx: ReviewContext,
) {
  if (userId === reviewerId) {
    throw errForbidden("队长不能审核自己的注册申请");
  }
  const user = await getOrThrow(userId);

  const result = await db.user.updateMany({
    where: { id: userId, status: "PENDING" },
    data: {
      status: "ACTIVE",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewReason: null,
    },
  });
  if (result.count === 0) {
    throw errConflict("该用户当前不是待审核状态，可能已被其他队长处理");
  }

  await writeAudit(
    auditEntry(ctx, {
      action: "USER_APPROVE",
      resourceId: userId,
      before: { status: user.status },
      after: { status: "ACTIVE" },
    }),
  );
  return { id: userId, status: "ACTIVE" as const };
}

export async function rejectUser(
  userId: string,
  reviewerId: string,
  reason: string,
  ctx: ReviewContext,
) {
  if (userId === reviewerId) {
    throw errForbidden("队长不能审核自己的注册申请");
  }
  const user = await getOrThrow(userId);

  const result = await db.user.updateMany({
    where: { id: userId, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewReason: reason,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
  if (result.count === 0) {
    throw errConflict("该用户当前不是待审核状态，可能已被其他队长处理");
  }

  await revokeAllSessions(userId);

  await writeAudit(
    auditEntry(ctx, {
      action: "USER_REJECT",
      resourceId: userId,
      before: { status: user.status },
      after: { status: "REJECTED", reviewReason: reason },
      reason,
    }),
  );
  return { id: userId, status: "REJECTED" as const };
}

export async function suspendUser(
  userId: string,
  actorId: string,
  reason: string,
  ctx: ReviewContext,
) {
  if (userId === actorId) {
    throw errForbidden("不能停用自己的账号");
  }
  const user = await getOrThrow(userId);

  // 事务 + 行锁保护最后一名 ACTIVE CAPTAIN
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
    if (user.role === "CAPTAIN" && user.status === "ACTIVE") {
      const [{ count }] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "User"
        WHERE role = 'CAPTAIN' AND status = 'ACTIVE' AND "deletedAt" IS NULL
      `;
      if (Number(count) <= 1) {
        throw errForbidden("不能停用、删除或降级最后一名 ACTIVE 队长");
      }
    }

    const result = await tx.user.updateMany({
      where: { id: userId, status: "ACTIVE" },
      data: {
        status: "SUSPENDED",
        reviewReason: reason,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });
    if (result.count === 0) {
      throw errConflict("该用户当前不是 ACTIVE 状态");
    }
  });

  await revokeAllSessions(userId);

  await writeAudit(
    auditEntry(ctx, {
      action: "USER_SUSPEND",
      resourceId: userId,
      before: { status: user.status },
      after: { status: "SUSPENDED", reviewReason: reason },
      reason,
    }),
  );
  return { id: userId, status: "SUSPENDED" as const };
}

export async function restoreUser(
  userId: string,
  actorId: string,
  ctx: ReviewContext,
) {
  const user = await getOrThrow(userId);
  const result = await db.user.updateMany({
    where: { id: userId, status: "SUSPENDED" },
    data: {
      status: "ACTIVE",
      reviewReason: null,
      reviewedById: actorId,
      reviewedAt: new Date(),
    },
  });
  if (result.count === 0) {
    throw errConflict("该用户当前不是 SUSPENDED 状态");
  }
  await writeAudit(
    auditEntry(ctx, {
      action: "USER_RESTORE",
      resourceId: userId,
      before: { status: user.status },
      after: { status: "ACTIVE" },
    }),
  );
  return { id: userId, status: "ACTIVE" as const };
}

export async function changeUserRole(
  userId: string,
  actorId: string,
  role: "MEMBER" | "CAPTAIN",
  ctx: ReviewContext,
) {
  if (userId === actorId) {
    throw errForbidden("队长不能修改自己的角色");
  }
  const user = await getOrThrow(userId);
  if (user.status !== "ACTIVE") {
    throw errForbidden("只能修改 ACTIVE 用户的角色");
  }
  if (user.role === role) {
    throw errConflict("目标用户已是该角色");
  }

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;

    if (user.role === "CAPTAIN" && role === "MEMBER") {
      const [{ count }] = await tx.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "User"
        WHERE role = 'CAPTAIN' AND status = 'ACTIVE' AND "deletedAt" IS NULL
      `;
      if (Number(count) <= 1) {
        throw errForbidden("不能降级最后一名 ACTIVE 队长");
      }
    }

    await tx.user.update({
      where: { id: userId },
      data: { role },
    });
  });

  await revokeAllSessions(userId);

  await writeAudit(
    auditEntry(ctx, {
      action: "USER_ROLE_CHANGE",
      resourceId: userId,
      before: { role: user.role },
      after: { role },
    }),
  );
  return { id: userId, role };
}

export async function listUsers(input: {
  status?: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  cursor?: string;
  limit: number;
}) {
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      status: true,
      applicationMessage: true,
      reviewReason: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  const hasMore = users.length > input.limit;
  const items = hasMore ? users.slice(0, input.limit) : users;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}
