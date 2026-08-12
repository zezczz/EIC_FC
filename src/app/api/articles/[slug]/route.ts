import { NextRequest, NextResponse } from "next/server";
import { getPublicArticle } from "@/server/articles/service";
import { handle } from "@/server/http";
import { slugSchema } from "@/schemas/articles";

export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  const data = await getPublicArticle(slugSchema.parse(params.slug));
  return NextResponse.json({ data, requestId });
});
