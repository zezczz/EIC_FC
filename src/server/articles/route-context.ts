import type { NextRequest } from "next/server";
import type { ArticleContext } from "@/server/articles/service";
import { getClientIp } from "@/server/http";

export function articleRequestContext(
  request: NextRequest,
  requestId: string,
  actorId: string,
): ArticleContext {
  return {
    actorId,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}
