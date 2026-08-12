import { NextRequest, NextResponse } from "next/server";
import { relayEntrySchema, relayIdSchema } from "@/schemas/relays";
import { requireActiveMember } from "@/server/auth/guards";
import { handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { relayRequestContext } from "@/server/relays/route-context";
import { deleteRelayEntry, putRelayEntry } from "@/server/relays/service";

export const PUT = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const member = await requireActiveMember();
  const input = await parseJsonBody(request, relayEntrySchema);
  const data = await putRelayEntry(
    relayIdSchema.parse(params.id),
    member.id,
    input,
    relayRequestContext(request, requestId, member.id),
  );
  return NextResponse.json({ data, requestId });
});

export const DELETE = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const member = await requireActiveMember();
  const data = await deleteRelayEntry(
    relayIdSchema.parse(params.id),
    member.id,
    relayRequestContext(request, requestId, member.id),
  );
  return NextResponse.json({ data, requestId });
});
