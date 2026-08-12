import { NextRequest, NextResponse } from "next/server";
import { handle, requireSameOrigin, getClientIp } from "@/server/http";
import { signOutUser } from "@/server/auth/service";
import { writeAudit } from "@/server/audit";

/**
 * POST /api/auth/signout - 退出登录
 */
export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const ip = getClientIp(request);
  const sessionUser = await signOutUser();

  if (sessionUser) {
    await writeAudit({
      actorId: sessionUser.id,
      action: "USER_SIGNOUT",
      resourceType: "USER",
      resourceId: sessionUser.id,
      requestId,
      ip,
      userAgent: request.headers.get("user-agent"),
    });
  }

  return NextResponse.json({ data: { ok: true }, requestId });
});
