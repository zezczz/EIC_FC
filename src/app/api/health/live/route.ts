import { NextResponse } from "next/server";
import { handle } from "@/server/http";

/** GET /api/health/live - 进程存活检查（ARCHITECTURE.md §11.7） */
export const GET = handle(async () => {
  return NextResponse.json({ data: { status: "ok" }, requestId: "" });
});

/** HEAD 支持（容器健康检查常用） */
export const HEAD = handle(async () => {
  return new NextResponse(null, { status: 200 });
});
