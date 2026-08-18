import { NextRequest, NextResponse } from "next/server";
import { mediaPresignSchema } from "@/schemas/media";
import { requireProfileEditor } from "@/server/auth/guards";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { createMemberUploadIntent } from "@/server/users/profile";

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const user = await requireProfileEditor();
  const input = await parseJsonBody(request, mediaPresignSchema);
  if (input.purpose !== "AVATAR") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "仅支持上传头像", requestId },
      { status: 400 },
    );
  }
  const data = await createMemberUploadIntent(user.id, input, {
    actorId: user.id,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ data, requestId }, { status: 201 });
});
