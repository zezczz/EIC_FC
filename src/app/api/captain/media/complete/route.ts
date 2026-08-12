import { NextRequest, NextResponse } from "next/server";
import { mediaCompleteSchema } from "@/schemas/media";
import { requireCaptain } from "@/server/auth/guards";
import { completeUpload } from "@/server/media/service";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const { id } = await parseJsonBody(request, mediaCompleteSchema);
  const data = await completeUpload(id, {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
