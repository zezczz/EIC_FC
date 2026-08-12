import { NextRequest, NextResponse } from "next/server";
import {
  handle,
  parseJsonBody,
  requireSameOrigin,
  getClientIp,
} from "@/server/http";
import { requireCaptain } from "@/server/auth/guards";
import { changeRoleSchema, uuidParamSchema } from "@/schemas/users";
import { changeUserRole, type ReviewContext } from "@/server/users/service";

/**
 * POST /api/captain/users/:id/role
 */
export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const id = uuidParamSchema.parse(params.id);
  const input = await parseJsonBody(request, changeRoleSchema);
  const ctx: ReviewContext = {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const result = await changeUserRole(id, captain.id, input.role, ctx);
  return NextResponse.json({ data: result, requestId });
});
