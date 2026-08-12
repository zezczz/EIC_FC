import { NextRequest, NextResponse } from "next/server";
import { mediaPresignSchema } from "@/schemas/media";
import { requireCaptain } from "@/server/auth/guards";
import { createUploadIntent } from "@/server/media/service";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const input = await parseJsonBody(request, mediaPresignSchema);
  const data = await createUploadIntent(input, {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId }, { status: 201 });
});
