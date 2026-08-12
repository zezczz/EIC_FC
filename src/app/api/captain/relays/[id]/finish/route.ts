import { NextRequest, NextResponse } from "next/server";
import { relayIdSchema } from "@/schemas/relays";
import { requireCaptain } from "@/server/auth/guards";
import { handle, requireSameOrigin } from "@/server/http";
import { relayRequestContext } from "@/server/relays/route-context";
import { finishRelay } from "@/server/relays/service";

export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const data = await finishRelay(
    relayIdSchema.parse(params.id),
    relayRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
