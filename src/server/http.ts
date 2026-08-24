import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "@/server/errors";
import { env, trustedOrigins } from "@/server/env";
import { logger } from "@/server/logger";

/**
 * HTTP 协议层工具（ARCHITECTURE.md §11.1）。
 */

export function newRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function getClientIp(request: NextRequest): string {
  // 仅在配置了可信代理时读取 X-Forwarded-For（Caddy 反代场景）
  const trustProxy = process.env.TRUST_PROXY === "true" || env.NODE_ENV === "production";
  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
  }
  return "unknown";
}

function normalizeOrigin(value: string): string {
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}`;
  } catch {
    return value.replace(/\/$/, "");
  }
}

function trustProxy(): boolean {
  return process.env.TRUST_PROXY === "true" || env.NODE_ENV === "production";
}

/** 还原浏览器看到的站点 Origin（Caddy 反代时用转发头） */
function requestSelfOrigin(request: NextRequest): string | null {
  const hostHeader = trustProxy()
    ? (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
    : request.headers.get("host");
  const host = hostHeader?.split(",")[0]?.trim();
  if (!host) return null;

  const proto = trustProxy()
    ? (request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http")
    : request.nextUrl.protocol.replace(":", "") || "http";
  return normalizeOrigin(`${proto}://${host}`);
}

const normalizedTrusted = trustedOrigins.map(normalizeOrigin);

/**
 * 写操作同源校验（CSRF 防护）。
 * Origin 与当前请求自身一致、或落在 TRUSTED_ORIGINS / APP_URL 时放行。
 * 生产环境缺少 Origin 且 Sec-Fetch-Site 非 same-origin 时拒绝。
 */
export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    const normalized = normalizeOrigin(origin);
    if (normalizedTrusted.includes(normalized)) return true;
    const self = requestSelfOrigin(request);
    return self !== null && normalized === self;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "none") {
    return true;
  }

  // 开发环境允许无 Origin 的 curl；生产拒绝
  if (env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

export function requireSameOrigin(request: NextRequest): void {
  if (!assertSameOrigin(request)) {
    throw new AppError("FORBIDDEN", "请求来源不被信任");
  }
}

/** 解析并校验 JSON 请求体 */
export async function parseJsonBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "请求体必须是合法 JSON");
  }
  try {
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string[] | undefined> = {};
      for (const issue of e.issues) {
        const key = issue.path.join(".") || "_";
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
      throw new AppError("VALIDATION_ERROR", "请求参数校验失败", {
        fieldErrors,
      });
    }
    throw e;
  }
}

export function jsonOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(
    { data, requestId: newRequestId() },
    { status: init?.status ?? 200, headers: init?.headers },
  );
}

export function jsonError(error: unknown, requestId: string): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
        requestId,
      },
      { status: error.status },
    );
  }
  logger.error({ err: error, requestId }, "未处理异常");
  return NextResponse.json(
    {
      code: "INTERNAL_ERROR",
      message: "服务器内部错误",
      fieldErrors: {},
      requestId,
    },
    { status: 500 },
  );
}

type RouteContext = {
  requestId: string;
  params: Record<string, string | string[]>;
};

type ResolvedRouteParams = Record<string, string | string[]>;
type RouteParams = { params: Promise<ResolvedRouteParams> | ResolvedRouteParams };

/** 读取动态路由单个字符串参数 */
export function getRouteParam(params: Record<string, string | string[]>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Route Handler 包装器：透传动态路由 params、生成 requestId、捕获错误 */
export function handle(fn: (request: NextRequest, ctx: RouteContext) => Promise<NextResponse>) {
  return async (request: NextRequest, routeCtx?: RouteParams) => {
    const requestId = newRequestId();
    const start = Date.now();
    try {
      const rawParams = routeCtx?.params ?? {};
      const params =
        typeof (rawParams as Promise<ResolvedRouteParams>).then === "function"
          ? await (rawParams as Promise<ResolvedRouteParams>)
          : (rawParams as ResolvedRouteParams);
      const response = await fn(request, { requestId, params });
      // 回写统一 requestId（若响应体已是 JSON 且无 requestId 则不强制改写）
      response.headers.set("x-request-id", requestId);
      logRequest(request, requestId, response.status, start);
      return response;
    } catch (error) {
      const response = jsonError(error, requestId);
      logRequest(request, requestId, response.status, start);
      return response;
    }
  };
}

function logRequest(request: NextRequest, requestId: string, status: number, start: number) {
  logger.info({
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    status,
    durationMs: Date.now() - start,
  });
}
