import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";
import { requireActiveMember } from "@/server/auth/guards";
import { listMembers } from "@/server/users/profile";

export const GET = handle(async (_request: NextRequest, { requestId }) => {
  const user = await requireActiveMember();
  const items = await listMembers(user.id);
  return NextResponse.json({ data: { items }, requestId });
});
