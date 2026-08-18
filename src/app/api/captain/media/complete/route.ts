import { NextRequest, NextResponse } from "next/server";
import { mediaCompleteSchema } from "@/schemas/media";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { completeUpload } from "@/server/media/service";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.MEDIA_UPLOAD);
  const { id } = await parseJsonBody(request, mediaCompleteSchema);
  const data = await completeUpload(id, {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId });
});
