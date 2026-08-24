import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";
import { requireActiveMember } from "@/server/auth/guards";
import { getTeamProfile } from "@/server/team/service";

export const GET = handle(async (_request: NextRequest, { requestId }) => {
  await requireActiveMember();
  const data = await getTeamProfile();
  return NextResponse.json({ data, requestId });
});
