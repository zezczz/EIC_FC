import { NextRequest, NextResponse } from "next/server";
import { mediaIdSchema } from "@/schemas/media";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { deleteMedia } from "@/server/media/service";
import { getClientIp, handle, requireSameOrigin } from "@/server/http";

export const DELETE = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.MEDIA_UPLOAD);
  const data = await deleteMedia(mediaIdSchema.parse(params.id), {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
