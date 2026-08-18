import { NextRequest, NextResponse } from "next/server";
import { relayIdSchema } from "@/schemas/relays";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { handle, requireSameOrigin } from "@/server/http";
import { relayRequestContext } from "@/server/relays/route-context";
import { cancelRelay } from "@/server/relays/service";

export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.RELAYS_WRITE);
  const data = await cancelRelay(
    relayIdSchema.parse(params.id),
    relayRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
