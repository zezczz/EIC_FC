import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";

/**
 * GET /api/auth/providers - 认证提供方信息（ARCHITECTURE.md §11.2）
 */
export const GET = handle(async (_request: NextRequest, { requestId }) => {
  return NextResponse.json({
    data: {
      credentials: {
        id: "credentials",
        name: "用户名或邮箱",
        type: "credentials",
      },
    },
    requestId,
  });
});
