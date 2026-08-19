import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";
import { getTeamProfile } from "@/server/team/service";

export const GET = handle(async (_request: NextRequest, { requestId }) => {
  const data = await getTeamProfile();
  return NextResponse.json({ data, requestId });
});
