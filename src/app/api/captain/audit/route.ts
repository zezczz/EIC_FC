import { NextRequest, NextResponse } from "next/server";
import { auditListQuerySchema } from "@/schemas/audit";
import { listAuditLogs } from "@/server/audit";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { handle } from "@/server/http";

export const GET = handle(async (request: NextRequest, { requestId }) => {
  await requirePermission(PERMISSIONS.AUDIT_READ);
  const query = auditListQuerySchema.parse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
    action: request.nextUrl.searchParams.get("action") ?? undefined,
  });
  const data = await listAuditLogs(query);
  return NextResponse.json({ data, requestId });
});
