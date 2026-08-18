import { NextRequest, NextResponse } from "next/server";
import { articleIdSchema } from "@/schemas/articles";
import { restoreArticle } from "@/server/articles/service";
import { articleRequestContext } from "@/server/articles/route-context";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { handle, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  const data = await restoreArticle(
    articleIdSchema.parse(params.id),
    articleRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
