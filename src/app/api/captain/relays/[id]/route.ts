import { NextRequest, NextResponse } from "next/server";
import { relayIdSchema, relayUpdateSchema } from "@/schemas/relays";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { relayRequestContext } from "@/server/relays/route-context";
import { deleteRelay, getCaptainRelay, updateRelay } from "@/server/relays/service";

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  await requirePermission(PERMISSIONS.RELAYS_WRITE);
  const data = await getCaptainRelay(relayIdSchema.parse(params.id));
  return NextResponse.json({ data, requestId });
});

export const PATCH = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.RELAYS_WRITE);
  const input = await parseJsonBody(request, relayUpdateSchema);
  const data = await updateRelay(
    relayIdSchema.parse(params.id),
    input,
    relayRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});

export const DELETE = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.RELAYS_WRITE);
  const data = await deleteRelay(
    relayIdSchema.parse(params.id),
    relayRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
