import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { listUsers } from "@/server/users/service";
import { userListQuerySchema } from "@/schemas/users";

/**
 * GET /api/captain/users - 用户列表
 */
export const GET = handle(async (request: NextRequest, { requestId }) => {
  await requirePermission(PERMISSIONS.USERS_REVIEW);
  const query = userListQuerySchema.parse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  const data = await listUsers(query);
  return NextResponse.json({ data, requestId });
});
