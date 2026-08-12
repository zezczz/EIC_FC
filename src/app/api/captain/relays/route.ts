import { NextRequest, NextResponse } from "next/server";
import { relayCreateSchema, relayListQuerySchema } from "@/schemas/relays";
import { requireCaptain } from "@/server/auth/guards";
import { handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { relayRequestContext } from "@/server/relays/route-context";
import { createRelay, listCaptainRelays } from "@/server/relays/service";

export const GET = handle(async (request: NextRequest, { requestId }) => {
  await requireCaptain();
  const query = relayListQuerySchema.parse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
  });
  const data = await listCaptainRelays(query);
  return NextResponse.json({ data, requestId });
});

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const input = await parseJsonBody(request, relayCreateSchema);
  const data = await createRelay(input, relayRequestContext(request, requestId, captain.id));
  return NextResponse.json({ data, requestId }, { status: 201 });
});
