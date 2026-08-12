import { NextRequest, NextResponse } from "next/server";
import {
  handle,
  parseJsonBody,
  requireSameOrigin,
  getClientIp,
} from "@/server/http";
import { requireCaptain } from "@/server/auth/guards";
import { suspendUserSchema, uuidParamSchema } from "@/schemas/users";
import { suspendUser, type ReviewContext } from "@/server/users/service";

/**
 * POST /api/captain/users/:id/suspend
 */
export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const id = uuidParamSchema.parse(params.id);
  const input = await parseJsonBody(request, suspendUserSchema);
  const ctx: ReviewContext = {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const result = await suspendUser(id, captain.id, input.reason, ctx);
  return NextResponse.json({ data: result, requestId });
});
