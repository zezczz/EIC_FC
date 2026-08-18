import { NextRequest, NextResponse } from "next/server";
import { relayIdSchema } from "@/schemas/relays";
import { PERMISSIONS } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/guards";
import { handle } from "@/server/http";
import { buildRelayExportWorkbook } from "@/server/relays/export";

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  await requirePermission(PERMISSIONS.RELAYS_WRITE);
  const { buffer, filename } = await buildRelayExportWorkbook(relayIdSchema.parse(params.id));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
});
