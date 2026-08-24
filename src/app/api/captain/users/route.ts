import { NextRequest, NextResponse } from "next/server";
import { handle, parseJsonBody, requireSameOrigin, getClientIp } from "@/server/http";
import { requireAnyPermission, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { createMemberByCaptain, listUsers, type ReviewContext } from "@/server/users/service";
import { createMemberSchema, userListQuerySchema } from "@/schemas/users";

/**
 * GET /api/captain/users - 用户列表
 */
export const GET = handle(async (request: NextRequest, { requestId }) => {
  await requireAnyPermission(
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_REVIEW,
    PERMISSIONS.USERS_ROLES,
  );
  const query = userListQuerySchema.parse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  const data = await listUsers(query);
  return NextResponse.json({ data, requestId });
});

/**
 * POST /api/captain/users - 队长直接创建 ACTIVE 队员
 */
export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.USERS_REVIEW);
  const input = await parseJsonBody(request, createMemberSchema);
  const ctx: ReviewContext = {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
  const data = await createMemberByCaptain(input, captain.id, ctx);
  return NextResponse.json({ data, requestId }, { status: 201 });
});
