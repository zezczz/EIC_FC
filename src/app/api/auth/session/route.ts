import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";
import { getSessionUser } from "@/server/auth/session";

/**
 * GET /api/auth/session - 当前会话
 */
export const GET = handle(async (_request: NextRequest, { requestId }) => {
  const sessionUser = await getSessionUser();
  return NextResponse.json({
    data: sessionUser
      ? {
          user: {
            id: sessionUser.id,
            username: sessionUser.username,
            displayName: sessionUser.displayName,
            role: sessionUser.role,
            status: sessionUser.status,
            reviewReason: sessionUser.reviewReason,
          },
        }
      : { user: null },
    requestId,
  });
});
