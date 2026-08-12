import type { Prisma, Relay } from "@/generated/prisma/client";
import { errNotFound } from "@/server/errors";

export type RelayCapacity = {
  joined: number;
  waitlisted: number;
  remaining: number | null;
  overCapacity: boolean;
};

export async function lockRelay(tx: Prisma.TransactionClient, relayId: string): Promise<Relay> {
  await tx.$queryRaw`SELECT id FROM "Relay" WHERE id = ${relayId}::uuid FOR UPDATE`;
  const relay = await tx.relay.findUnique({ where: { id: relayId } });
  if (!relay || relay.deletedAt) throw errNotFound("接龙不存在");
  return relay;
}

export async function getCapacity(
  tx: Prisma.TransactionClient,
  relayId: string,
  capacity: number | null,
): Promise<RelayCapacity> {
  const [joined, waitlisted] = await Promise.all([
    tx.relayEntry.aggregate({
      where: { relayId, response: "JOINED" },
      _sum: { participantCount: true },
    }),
    tx.relayEntry.aggregate({
      where: { relayId, response: "WAITLISTED" },
      _sum: { participantCount: true },
    }),
  ]);
  const joinedCount = joined._sum.participantCount ?? 0;
  const waitlistedCount = waitlisted._sum.participantCount ?? 0;
  return {
    joined: joinedCount,
    waitlisted: waitlistedCount,
    remaining: capacity === null ? null : Math.max(0, capacity - joinedCount),
    overCapacity: capacity !== null && joinedCount > capacity,
  };
}

export async function promoteWaitlist(
  tx: Prisma.TransactionClient,
  relayId: string,
  capacity: number | null,
) {
  if (capacity === null) {
    await tx.relayEntry.updateMany({
      where: { relayId, response: "WAITLISTED" },
      data: { response: "JOINED" },
    });
    return;
  }
  const current = await getCapacity(tx, relayId, capacity);
  let remaining = Math.max(0, capacity - current.joined);
  const waiting = await tx.relayEntry.findMany({
    where: { relayId, response: "WAITLISTED" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, participantCount: true },
  });
  for (const entry of waiting) {
    if (entry.participantCount <= remaining) {
      await tx.relayEntry.update({
        where: { id: entry.id },
        data: { response: "JOINED" },
      });
      remaining -= entry.participantCount;
    }
  }
}
