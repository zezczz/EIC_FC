/**
 * 统一错误类型（ARCHITECTURE.md 第 11.1 章）。
 * Route Handler 捕获 AppError 后返回统一 JSON 错误格式：
 * { code, message, fieldErrors?, requestId }
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VERSION_CONFLICT"
  | "RATE_LIMITED"
  | "RELAY_FULL"
  | "RELAY_CLOSED"
  | "INVALID_STATE"
  | "PAYLOAD_TOO_LARGE"
  | "MEDIA_REJECTED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors: Record<string, string[] | undefined>;
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      status?: number;
      fieldErrors?: Record<string, string[] | undefined>;
      expose?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? statusForCode(code);
    this.fieldErrors = options.fieldErrors ?? {};
    this.expose = options.expose ?? true;
  }
}

function statusForCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "VERSION_CONFLICT":
    case "INVALID_STATE":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "PAYLOAD_TOO_LARGE":
      return 413;
    case "RELAY_FULL":
    case "RELAY_CLOSED":
    case "MEDIA_REJECTED":
      return 422;
    default:
      return 500;
  }
}

export const errValidation = (
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
) => new AppError("VALIDATION_ERROR", message, { fieldErrors });

export const errUnauthorized = (message = "请先登录") => new AppError("UNAUTHORIZED", message);

export const errForbidden = (message = "没有权限执行此操作") => new AppError("FORBIDDEN", message);

export const errNotFound = (message = "资源不存在") => new AppError("NOT_FOUND", message);

export const errConflict = (message: string) => new AppError("CONFLICT", message);

export const errVersionConflict = (message = "数据已被其他人修改，请刷新后重试") =>
  new AppError("VERSION_CONFLICT", message);

export const errRateLimited = (message = "请求过于频繁，请稍后再试") =>
  new AppError("RATE_LIMITED", message);
