import { NextRequest, NextResponse } from "next/server";
import { mediaPresignSchema } from "@/schemas/media";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { createUploadIntent } from "@/server/media/service";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.MEDIA_UPLOAD);
  const input = await parseJsonBody(request, mediaPresignSchema);
  const data = await createUploadIntent(input, {
    actorId: captain.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId }, { status: 201 });
});
