import { NextResponse } from "next/server";
import { handle, newRequestId } from "@/server/http";
import { db } from "@/server/db";
import { env } from "@/server/env";

/**
 * GET /api/health/ready - 检查 PostgreSQL 与对象存储可达性
 */
export const GET = handle(async () => {
  const requestId = newRequestId();
  let dbOk = false;
  let s3Ok = false;

  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(env.S3_ENDPOINT, {
      method: "HEAD",
      signal: controller.signal,
    }).catch(async () => {
      // 部分 S3 端点不支持 HEAD，尝试 GET
      return fetch(env.S3_ENDPOINT, {
        method: "GET",
        signal: controller.signal,
      });
    });
    clearTimeout(timer);
    s3Ok = res.status < 500;
  } catch {
    s3Ok = false;
  }

  const ready = dbOk && s3Ok;
  return NextResponse.json(
    {
      data: {
        status: ready ? "ready" : "not_ready",
        checks: {
          postgres: dbOk ? "ok" : "failed",
          objectStorage: s3Ok ? "ok" : "failed",
        },
      },
      requestId,
    },
    { status: ready ? 200 : 503 },
  );
});
