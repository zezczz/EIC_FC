import { NextRequest, NextResponse } from "next/server";
import { profileUpdateSchema } from "@/schemas/account";
import { uuidParamSchema } from "@/schemas/users";
import { requireActiveMember } from "@/server/auth/guards";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { getMemberProfile, updateProfile } from "@/server/users/profile";

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  const viewer = await requireActiveMember();
  const data = await getMemberProfile(uuidParamSchema.parse(params.id), viewer.id);
  return NextResponse.json({ data, requestId });
});

export const PATCH = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const viewer = await requireActiveMember();
  const input = await parseJsonBody(request, profileUpdateSchema);
  const data = await updateProfile(uuidParamSchema.parse(params.id), input, {
    actorId: viewer.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
