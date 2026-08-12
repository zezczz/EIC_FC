import { NextRequest, NextResponse } from "next/server";
import { handle, requireSameOrigin, getClientIp } from "@/server/http";
import { requireCaptain } from "@/server/auth/guards";
import { uuidParamSchema } from "@/schemas/users";
import { restoreUser, type ReviewContext } from "@/server/users/service";

/**
 * POST /api/captain/users/:id/restore
 */
export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const id = uuidParamSchema.parse(params.id);
  const ctx: ReviewContext = {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const result = await restoreUser(id, captain.id, ctx);
  return NextResponse.json({ data: result, requestId });
});
