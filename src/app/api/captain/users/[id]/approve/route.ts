import { NextRequest, NextResponse } from "next/server";
import { handle, requireSameOrigin, getClientIp } from "@/server/http";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { approveUser, type ReviewContext } from "@/server/users/service";
import { uuidParamSchema } from "@/schemas/users";

/**
 * POST /api/captain/users/:id/approve
 */
export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.USERS_REVIEW);
  const id = uuidParamSchema.parse(params.id);
  const ctx: ReviewContext = {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const result = await approveUser(id, captain.id, ctx);
  return NextResponse.json({ data: result, requestId });
});
