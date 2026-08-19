import { NextRequest, NextResponse } from "next/server";
import { getPublicArticle } from "@/server/articles/service";
import { normalizeArticleSlug } from "@/server/articles/slug";
import { handle } from "@/server/http";
import { slugSchema } from "@/schemas/articles";

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  const slug = normalizeArticleSlug(slugSchema.parse(params.slug));
  const data = await getPublicArticle(slug);
  return NextResponse.json({ data, requestId });
});
