import { NextRequest, NextResponse } from "next/server";
import { handle, parseJsonBody, requireSameOrigin, getClientIp } from "@/server/http";
import { loginSchema } from "@/schemas/auth";
import { loginUser, userAuditPayload } from "@/server/auth/service";
import { writeAudit } from "@/server/audit";

/**
 * POST /api/auth/callback/credentials - 登录
 */
export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const ip = getClientIp(request);
  const input = await parseJsonBody(request, loginSchema);
  const user = await loginUser(input, ip);

  await writeAudit({
    actorId: user.id,
    action: "USER_LOGIN",
    resourceType: "USER",
    resourceId: user.id,
    after: userAuditPayload(user),
    requestId,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({
    data: {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
      },
    },
    requestId,
  });
});
