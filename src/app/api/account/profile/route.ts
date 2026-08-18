import { NextRequest, NextResponse } from "next/server";
import { profileUpdateSchema } from "@/schemas/account";
import { requireProfileEditor } from "@/server/auth/guards";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { updateProfile } from "@/server/users/profile";

export const PATCH = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const user = await requireProfileEditor();
  const input = await parseJsonBody(request, profileUpdateSchema);
  const data = await updateProfile(user.id, input, {
    actorId: user.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
