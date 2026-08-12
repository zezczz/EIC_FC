import { NextRequest, NextResponse } from "next/server";
import { mediaIdSchema } from "@/schemas/media";
import { requireCaptain } from "@/server/auth/guards";
import { deleteMedia } from "@/server/media/service";
import { getClientIp, handle, requireSameOrigin } from "@/server/http";

export const DELETE = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const data = await deleteMedia(mediaIdSchema.parse(params.id), {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
