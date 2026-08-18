import { NextRequest, NextResponse } from "next/server";
import { articleCreateSchema, articleListQuerySchema } from "@/schemas/articles";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { createArticle, listCaptainArticles, type ArticleContext } from "@/server/articles/service";
import { getClientIp, handle, parseJsonBody, requireSameOrigin } from "@/server/http";

function context(request: NextRequest, requestId: string, actorId: string): ArticleContext {
  return {
    actorId,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}

export const GET = handle(async (request: NextRequest, { requestId }) => {
  await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  const query = articleListQuerySchema.parse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    deleted: request.nextUrl.searchParams.get("deleted") ?? undefined,
  });
  const data = await listCaptainArticles(query);
  return NextResponse.json({ data, requestId });
});

export const POST = handle(async (request: NextRequest, { requestId }) => {
  requireSameOrigin(request);
  const captain = await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  const input = await parseJsonBody(request, articleCreateSchema);
  const data = await createArticle(input, context(request, requestId, captain.id));
  return NextResponse.json({ data, requestId }, { status: 201 });
});
