import { NextRequest, NextResponse } from "next/server";
import { updateStaffPermissionsSchema, uuidParamSchema } from "@/schemas/users";
import { PERMISSIONS } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/guards";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";
import { updateStaffPermissions } from "@/server/users/service";

export const PATCH = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const actor = await requirePermission(PERMISSIONS.USERS_ROLES);
  const input = await parseJsonBody(request, updateStaffPermissionsSchema);
  const data = await updateStaffPermissions(
    uuidParamSchema.parse(params.id),
    actor.id,
    {
      role: input.role,
      staffTitle: input.staffTitle ?? null,
      teamTitle: input.teamTitle,
      permissions: input.permissions as import("@/server/auth/permissions").Permission[],
      profilePermissions: input.profilePermissions,
    },
    {
      actorId: actor.id,
      requestId,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    },
  );
  return NextResponse.json({ data, requestId });
});
