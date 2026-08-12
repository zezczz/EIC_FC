import { NextRequest, NextResponse } from "next/server";
import { relayIdSchema } from "@/schemas/relays";
import { requireActiveMember } from "@/server/auth/guards";
import { handle } from "@/server/http";
import { getMemberRelay } from "@/server/relays/service";

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  const member = await requireActiveMember();
  const data = await getMemberRelay(relayIdSchema.parse(params.id), member.id);
  return NextResponse.json({ data, requestId });
});
