/**
 * 集成测试 setup：确保 Prisma 使用测试环境变量。
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";

// 优先 .env.test（如存在），否则 .env.local
if (existsSync(".env.test")) {
  loadDotenv({ path: ".env.test", override: true });
} else if (existsSync(".env.local")) {
  loadDotenv({ path: ".env.local", override: true });
}
