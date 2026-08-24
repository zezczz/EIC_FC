import { handle } from "@/server/http";
import { errForbidden } from "@/server/errors";

/**
 * POST /api/auth/register — 公开注册已关闭。
 * 队员由队长在后台直接开通账号。
 */
export const POST = handle(async () => {
  throw errForbidden("公开注册已关闭");
});
