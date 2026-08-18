import { NextRequest, NextResponse } from "next/server";
import {
  handle,
  parseJsonBody,
  requireSameOrigin,
  getClientIp,
} from "@/server/http";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { rejectUserSchema, uuidParamSchema } from "@/schemas/users";
import { rejectUser, type ReviewContext } from "@/server/users/service";

/**
 * POST /api/captain/users/:id/reject
 */
export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.USERS_REVIEW);
  const id = uuidParamSchema.parse(params.id);
  const input = await parseJsonBody(request, rejectUserSchema);
  const ctx: ReviewContext = {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const result = await rejectUser(id, captain.id, input.reason, ctx);
  return NextResponse.json({ data: result, requestId });
});
