import { NextRequest, NextResponse } from "next/server";
import { handle } from "@/server/http";
import { requireCaptain } from "@/server/auth/guards";
import { db } from "@/server/db";
import { uuidParamSchema } from "@/schemas/users";
import { errNotFound } from "@/server/errors";

/**
 * GET /api/captain/users/:id - 用户详情
 */
export const GET = handle(async (_request: NextRequest, { requestId, params }) => {
  await requireCaptain();
  const id = uuidParamSchema.parse(params.id);
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      status: true,
      applicationMessage: true,
      reviewReason: true,
      reviewedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) throw errNotFound("用户不存在");
  return NextResponse.json({ data: user, requestId });
});
