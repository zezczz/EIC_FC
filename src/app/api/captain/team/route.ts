import { NextRequest, NextResponse } from "next/server";
import { teamProfileUpdateSchema } from "@/schemas/team";
import { requireCaptain } from "@/server/auth/guards";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { getTeamProfile, updateTeamProfile } from "@/server/team/service";

export const GET = handle(async (_request: NextRequest, { requestId }) => {
  await requireCaptain();
  const data = await getTeamProfile();
  return NextResponse.json({ data, requestId });
});

export const PATCH = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const input = await parseJsonBody(request, teamProfileUpdateSchema);
  const data = await updateTeamProfile(input, {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
