import { revalidatePath } from "next/cache";
import type { RelayStatus, RelayResponse } from "@/generated/prisma/enums";
import type { RelayCreateInput, RelayEntryInput, RelayUpdateInput } from "@/schemas/relays";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { AppError, errConflict, errNotFound, errVersionConflict } from "@/server/errors";
import { getCapacity, lockRelay, promoteWaitlist } from "@/server/relays/capacity";

export type RelayContext = {
  actorId: string;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

async function audit(
  ctx: RelayContext,
  action: string,
  id: string,
  before?: unknown,
  after?: unknown,
) {
  await writeAudit({
    actorId: ctx.actorId,
    action,
    resourceType: "RELAY",
    resourceId: id,
    before,
    after,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

async function getRelayOrThrow(id: string) {
  const relay = await db.relay.findUnique({ where: { id } });
  if (!relay || relay.deletedAt) throw errNotFound("接龙不存在");
  return relay;
}

async function getDeletedRelayOrThrow(id: string) {
  const relay = await db.relay.findUnique({ where: { id } });
  if (!relay) throw errNotFound("接龙不存在");
  if (!relay.deletedAt) throw errConflict("接龙未被删除");
  return relay;
}

function invalidateRelay(id?: string) {
  try {
    revalidatePath("/captain/relays");
    revalidatePath("/relay");
    if (id) revalidatePath(`/relay/${id}`);
  } catch {
    // 非 Next.js 请求上下文（测试/脚本）忽略缓存刷新
  }
}

function assertDates(input: { eventAt: Date; eventEndsAt: Date | null; signupDeadline: Date }) {
  if (input.signupDeadline > input.eventAt) {
    throw new AppError("VALIDATION_ERROR", "报名截止时间不能晚于活动时间");
  }
  if (input.eventEndsAt && input.eventEndsAt <= input.eventAt) {
    throw new AppError("VALIDATION_ERROR", "结束时间必须晚于活动开始时间");
  }
}

export async function createRelay(input: RelayCreateInput, ctx: RelayContext) {
  assertDates({
    eventAt: input.eventAt,
    eventEndsAt: input.eventEndsAt ?? null,
    signupDeadline: input.signupDeadline,
  });
  const relay = await db.relay.create({
    data: {
      title: input.title,
      description: input.description,
      eventAt: input.eventAt,
      eventEndsAt: input.eventEndsAt ?? null,
      location: input.location,
      signupDeadline: input.signupDeadline,
      capacity: input.capacity ?? null,
      waitlistEnabled: input.waitlistEnabled,
      createdById: ctx.actorId,
    },
  });
  await audit(ctx, "RELAY_CREATE", relay.id, undefined, { title: relay.title });
  invalidateRelay(relay.id);
  return relay;
}

export async function updateRelay(id: string, input: RelayUpdateInput, ctx: RelayContext) {
  const before = await getRelayOrThrow(id);
  if (["CANCELLED", "FINISHED"].includes(before.status)) {
    throw new AppError("INVALID_STATE", "已取消或已完成的接龙不可编辑");
  }
  const merged = {
    eventAt: input.eventAt ?? before.eventAt,
    eventEndsAt: input.eventEndsAt === undefined ? before.eventEndsAt : input.eventEndsAt,
    signupDeadline: input.signupDeadline ?? before.signupDeadline,
  };
  assertDates(merged);
  const result = await db.relay.updateMany({
    where: { id, version: input.version, deletedAt: null },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.eventAt !== undefined ? { eventAt: input.eventAt } : {}),
      ...(input.eventEndsAt !== undefined ? { eventEndsAt: input.eventEndsAt } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.signupDeadline !== undefined ? { signupDeadline: input.signupDeadline } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      ...(input.waitlistEnabled !== undefined ? { waitlistEnabled: input.waitlistEnabled } : {}),
      version: { increment: 1 },
    },
  });
  if (result.count === 0) throw errVersionConflict("接龙已被其他人修改，请刷新后重试");
  const relay = await getRelayOrThrow(id);
  await audit(ctx, "RELAY_UPDATE", id, { version: before.version }, { version: relay.version });
  invalidateRelay(id);
  return relay;
}

async function transitionRelay(
  id: string,
  allowed: RelayStatus[],
  next: RelayStatus,
  action: string,
  ctx: RelayContext,
) {
  const before = await getRelayOrThrow(id);
  if (!allowed.includes(before.status)) {
    throw new AppError("INVALID_STATE", "当前接龙状态不允许此操作");
  }
  if (next === "OPEN") {
    assertDates(before);
    if (before.signupDeadline <= new Date() || before.eventAt <= new Date()) {
      throw new AppError("INVALID_STATE", "截止时间和活动时间必须晚于当前时间");
    }
  }
  const relay = await db.relay.update({
    where: { id },
    data: { status: next, version: { increment: 1 } },
  });
  await audit(ctx, action, id, { status: before.status }, { status: next });
  invalidateRelay(id);
  return relay;
}

export const openRelay = (id: string, ctx: RelayContext) =>
  transitionRelay(id, ["DRAFT"], "OPEN", "RELAY_OPEN", ctx);
export const reopenRelay = (id: string, ctx: RelayContext) =>
  transitionRelay(id, ["CLOSED"], "OPEN", "RELAY_REOPEN", ctx);
export const closeRelay = (id: string, ctx: RelayContext) =>
  transitionRelay(id, ["OPEN"], "CLOSED", "RELAY_CLOSE", ctx);
export const cancelRelay = (id: string, ctx: RelayContext) =>
  transitionRelay(id, ["OPEN", "CLOSED"], "CANCELLED", "RELAY_CANCEL", ctx);
export const uncancelRelay = (id: string, ctx: RelayContext) =>
  transitionRelay(id, ["CANCELLED"], "CLOSED", "RELAY_UNCANCEL", ctx);
export const finishRelay = (id: string, ctx: RelayContext) =>
  transitionRelay(id, ["CLOSED"], "FINISHED", "RELAY_FINISH", ctx);

export async function deleteRelay(id: string, ctx: RelayContext) {
  await getRelayOrThrow(id);
  await db.relay.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: ctx.actorId,
      version: { increment: 1 },
    },
  });
  await audit(ctx, "RELAY_DELETE", id, { deletedAt: null }, { deletedAt: new Date() });
  invalidateRelay(id);
  return { id, deleted: true };
}

export async function restoreRelay(id: string, ctx: RelayContext) {
  const before = await getDeletedRelayOrThrow(id);
  const retention = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (before.deletedAt!.getTime() < retention) {
    throw errConflict("接龙已超过 30 天恢复期限");
  }
  await db.relay.update({
    where: { id },
    data: {
      deletedAt: null,
      deletedById: null,
      version: { increment: 1 },
    },
  });
  await audit(ctx, "RELAY_RESTORE", id, { deletedAt: before.deletedAt }, { deletedAt: null });
  invalidateRelay(id);
  return { id, restored: true };
}

export async function putRelayEntry(
  relayId: string,
  userId: string,
  input: RelayEntryInput,
  ctx: RelayContext,
) {
  const result = await db.$transaction(async (tx) => {
    const relay = await lockRelay(tx, relayId);
    if (relay.status !== "OPEN" || relay.signupDeadline <= new Date()) {
      throw new AppError("RELAY_CLOSED", "接龙未开放或报名已截止");
    }
    const existing = await tx.relayEntry.findUnique({
      where: { relayId_userId: { relayId, userId } },
    });

    let response: RelayResponse = input.response;
    if (input.response === "JOINED") {
      const aggregate = await tx.relayEntry.aggregate({
        where: { relayId, response: "JOINED" },
        _sum: { participantCount: true },
      });
      const occupied =
        (aggregate._sum.participantCount ?? 0) -
        (existing?.response === "JOINED" ? existing.participantCount : 0);
      const fits = relay.capacity === null || occupied + input.participantCount <= relay.capacity;
      if (!fits) {
        if (!relay.waitlistEnabled) throw new AppError("RELAY_FULL", "报名人数已满");
        response = "WAITLISTED";
      }
    }

    const entry = await tx.relayEntry.upsert({
      where: { relayId_userId: { relayId, userId } },
      create: {
        relayId,
        userId,
        response,
        participantCount: input.participantCount,
        companionNames: input.response === "JOINED" ? input.companionNames : [],
        note: input.note ?? null,
      },
      update: {
        response,
        participantCount: input.participantCount,
        companionNames: input.response === "JOINED" ? input.companionNames : [],
        note: input.note ?? null,
      },
    });
    if (existing?.response === "JOINED" && response !== "JOINED") {
      await promoteWaitlist(tx, relayId, relay.capacity);
    }
    const capacity = await getCapacity(tx, relayId, relay.capacity);
    return { entry, capacity };
  });
  await audit(ctx, "RELAY_ENTRY_UPSERT", relayId, undefined, {
    userId,
    response: result.entry.response,
    participantCount: result.entry.participantCount,
    companionNames: result.entry.companionNames,
  });
  return result;
}

export async function deleteRelayEntry(relayId: string, userId: string, ctx: RelayContext) {
  const result = await db.$transaction(async (tx) => {
    const relay = await lockRelay(tx, relayId);
    if (relay.status !== "OPEN" || relay.signupDeadline <= new Date()) {
      throw new AppError("RELAY_CLOSED", "接龙未开放或报名已截止");
    }
    const existing = await tx.relayEntry.findUnique({
      where: { relayId_userId: { relayId, userId } },
    });
    if (!existing) throw errNotFound("尚未报名");
    await tx.relayEntry.delete({ where: { id: existing.id } });
    if (existing.response === "JOINED") {
      await promoteWaitlist(tx, relayId, relay.capacity);
    }
    return getCapacity(tx, relayId, relay.capacity);
  });
  await audit(ctx, "RELAY_ENTRY_DELETE", relayId, { userId }, undefined);
  return { deleted: true, capacity: result };
}

export async function listMemberRelays(input: { cursor?: string; limit: number; userId: string }) {
  const rows = await db.relay.findMany({
    where: {
      deletedAt: null,
      status: { in: ["OPEN", "CLOSED"] },
    },
    orderBy: [{ eventAt: "asc" }, { id: "asc" }],
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    include: {
      entries: { where: { userId: input.userId } },
      _count: { select: { entries: true } },
    },
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export async function getMemberRelay(id: string, userId: string) {
  const relay = await db.relay.findFirst({
    where: {
      id,
      deletedAt: null,
      status: { in: ["OPEN", "CLOSED"] },
    },
    include: {
      entries: {
        orderBy: [{ response: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          response: true,
          participantCount: true,
          companionNames: true,
          note: true,
          userId: true,
          user: { select: { displayName: true } },
        },
      },
    },
  });
  if (!relay) throw errNotFound("接龙不存在");
  const capacity = await db.$transaction((tx) => getCapacity(tx, relay.id, relay.capacity));
  return {
    ...relay,
    capacityInfo: capacity,
    myEntry: relay.entries.find((entry) => entry.userId === userId) ?? null,
  };
}

export async function listCaptainRelays(input: {
  cursor?: string;
  limit: number;
  status?: RelayStatus;
  deleted?: boolean;
}) {
  const rows = await db.relay.findMany({
    where: input.deleted
      ? { deletedAt: { not: null } }
      : {
          deletedAt: null,
          ...(input.status ? { status: input.status } : {}),
        },
    orderBy: { eventAt: "desc" },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    include: { _count: { select: { entries: true } } },
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export async function getCaptainRelay(id: string) {
  return getRelayOrThrow(id);
}
