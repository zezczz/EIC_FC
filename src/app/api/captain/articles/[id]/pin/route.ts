import { NextRequest, NextResponse } from "next/server";
import { articleIdSchema, pinArticleSchema } from "@/schemas/articles";
import { pinArticle } from "@/server/articles/service";
import { articleRequestContext } from "@/server/articles/route-context";
import { requireCaptain } from "@/server/auth/guards";
import { handle, parseJsonBody, requireSameOrigin } from "@/server/http";

export const POST = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requireCaptain();
  const input = await parseJsonBody(request, pinArticleSchema);
  const data = await pinArticle(
    articleIdSchema.parse(params.id),
    input.pinOrder,
    articleRequestContext(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
