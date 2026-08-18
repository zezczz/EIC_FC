import { NextRequest, NextResponse } from "next/server";
import { relayIdSchema } from "@/schemas/relays";
import { PERMISSIONS } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/guards";
import { handle, requireSameOrigin } from "@/server/http";
import { relayRequestContext } from "@/server/relays/route-context";
import { reopenRelay } from "@/server/relays/service";

export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const actor = await requirePermission(PERMISSIONS.RELAYS_WRITE);
  const data = await reopenRelay(
    relayIdSchema.parse(params.id),
    relayRequestContext(request, requestId, actor.id),
  );
  return NextResponse.json({ data, requestId });
});
