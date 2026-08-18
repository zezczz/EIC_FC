import { NextRequest, NextResponse } from "next/server";
import { passwordChangeSchema } from "@/schemas/account";
import { requireProfileEditor } from "@/server/auth/guards";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { changePassword } from "@/server/users/profile";

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const user = await requireProfileEditor();
  const input = await parseJsonBody(request, passwordChangeSchema);
  const data = await changePassword(user.id, input, {
    actorId: user.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
