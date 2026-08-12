import { NextRequest, NextResponse } from "next/server";
import { articleIdSchema } from "@/schemas/articles";
import { archiveArticle } from "@/server/articles/service";
import { articleRequestContext } from "@/server/articles/route-context";
import { requireCaptain } from "@/server/auth/guards";
import { handle, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const data = await archiveArticle(
    articleIdSchema.parse(params.id),
    articleRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
