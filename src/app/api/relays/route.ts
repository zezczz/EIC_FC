import { NextRequest, NextResponse } from "next/server";
import { relayListQuerySchema } from "@/schemas/relays";
import { requireActiveMember } from "@/server/auth/guards";
import { handle } from "@/server/http";
import { listMemberRelays } from "@/server/relays/service";

export const GET = handle(async (request: NextRequest, { requestId }) => {
  const member = await requireActiveMember();
  const query = relayListQuerySchema.pick({ cursor: true, limit: true }).parse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  const data = await listMemberRelays({ ...query, userId: member.id });
  return NextResponse.json({ data, requestId });
});
