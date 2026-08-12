import { NextRequest, NextResponse } from "next/server";
import { handle, parseJsonBody, requireSameOrigin, getClientIp } from "@/server/http";
import { registerSchema } from "@/schemas/auth";
import { registerUser, userAuditPayload } from "@/server/auth/service";
import { writeAudit } from "@/server/audit";

/**
 * POST /api/auth/register - 注册（ARCHITECTURE.md §11.2）
 * 注册成功返回 201 + PENDING，并建立会话。
 */
export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const ip = getClientIp(request);
  const input = await parseJsonBody(request, registerSchema);
  const user = await registerUser(input, ip);

  await writeAudit({
    actorId: user.id,
    action: "USER_REGISTER",
    resourceType: "USER",
    resourceId: user.id,
    after: userAuditPayload(user),
    requestId,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json(
    {
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
      },
      requestId,
    },
    { status: 201 },
  );
});
