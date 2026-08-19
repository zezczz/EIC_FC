import { NextRequest, NextResponse } from "next/server";
import { articleIdSchema, articleUpdateSchema } from "@/schemas/articles";
import { requireAnyPermission, requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import {
  deleteArticle,
  getCaptainArticle,
  updateArticle,
  type ArticleContext,
} from "@/server/articles/service";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";

function context(request: NextRequest, requestId: string, actorId: string): ArticleContext {
  return {
    actorId,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  await requireAnyPermission(
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_WRITE,
    PERMISSIONS.ARTICLES_PUBLISH,
  );
  const data = await getCaptainArticle(articleIdSchema.parse(params.id));
  return NextResponse.json({ data, requestId });
});

export const PATCH = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  const input = await parseJsonBody(request, articleUpdateSchema);
  const data = await updateArticle(
    articleIdSchema.parse(params.id),
    input,
    context(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});

export const DELETE = handle(async (request: NextRequest, { requestId, params }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  const data = await deleteArticle(
    articleIdSchema.parse(params.id),
    context(request, requestId, captain.id),
  );
  return NextResponse.json({ data, requestId });
});
