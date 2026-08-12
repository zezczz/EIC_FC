import { NextRequest, NextResponse } from "next/server";
import { articleListQuerySchema } from "@/schemas/articles";
import { handle } from "@/server/http";
import { listPublicArticles } from "@/server/articles/service";

export const GET = handle(async (request: NextRequest, { requestId }) => {
  const query = articleListQuerySchema.pick({ cursor: true, limit: true }).parse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  const data = await listPublicArticles(query);
  return NextResponse.json({ data, requestId });
});
