/**
 * 集成测试全局 setup。
 * 仅允许指向本地测试库名（含 _test 或明确 localhost）。
 */
import { execSync } from "node:child_process";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";

function loadTestEnv() {
  if (existsSync(".env.test")) {
    loadDotenv({ path: ".env.test", override: true });
  } else if (existsSync(".env.local")) {
    loadDotenv({ path: ".env.local", override: true });
  } else if (existsSync(".env.example")) {
    loadDotenv({ path: ".env.example", override: true });
  }
  process.env.DATABASE_URL ||= "postgresql://eicfc:eicfc_dev_password@127.0.0.1:5432/eicfc_test";
  process.env.DIRECT_URL ||= process.env.DATABASE_URL;
}

export default function globalSetup() {
  loadTestEnv();
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(`集成测试只允许在本地数据库执行，当前 DATABASE_URL 不指向 localhost: ${url}`);
  }
  if (!/_test\b|eicfc_test/.test(url) && !process.env.ALLOW_INTEGRATION_ON_DEV_DB) {
    console.warn(
      "[integration] 警告：DATABASE_URL 未包含 _test。设置 ALLOW_INTEGRATION_ON_DEV_DB=1 可强制继续。",
    );
    if (!process.env.ALLOW_INTEGRATION_ON_DEV_DB) {
      // CI 使用 eicfc_test；本地若用 eicfc 需显式允许
      if (!url.includes("eicfc_test")) {
        throw new Error(
          "集成测试默认仅允许 eicfc_test。请使用测试库或设置 ALLOW_INTEGRATION_ON_DEV_DB=1",
        );
      }
    }
  }
  console.log("[integration] 重置数据库并执行迁移...");
  execSync("pnpm prisma migrate reset --force", {
    stdio: "inherit",
    env: process.env,
  });
}
