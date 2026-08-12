import { NextRequest, NextResponse } from "next/server";
import { auditListQuerySchema } from "@/schemas/audit";
import { listAuditLogs } from "@/server/audit";
import { requireCaptain } from "@/server/auth/guards";
import { handle } from "@/server/http";

export const GET = handle(async (request: NextRequest, { requestId }) => {
  await requireCaptain();
  const query = auditListQuerySchema.parse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    resourceType: request.nextUrl.searchParams.get("resourceType") ?? undefined,
    action: request.nextUrl.searchParams.get("action") ?? undefined,
  });
  const data = await listAuditLogs(query);
  return NextResponse.json({ data, requestId });
});
