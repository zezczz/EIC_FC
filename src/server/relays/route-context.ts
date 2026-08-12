import type { NextRequest } from "next/server";
import { getClientIp } from "@/server/http";
import type { RelayContext } from "@/server/relays/service";

export function relayRequestContext(
  request: NextRequest,
  requestId: string,
  actorId: string,
): RelayContext {
  return {
    actorId,
    requestId,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}
