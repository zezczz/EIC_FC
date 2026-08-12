/**
 * scripts/cleanup.ts - 清理过期会话、登录尝试、软删除与孤儿媒体（ARCHITECTURE.md §18.6）
 * 默认 dry-run；加 --apply 才执行。
 */
import { existsSync, readFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

function loadEnvFiles() {
  const read = (path: string): Record<string, string> => {
    if (!existsSync(path)) return {};
    try {
      return parseDotenv(readFileSync(path, "utf8")) ?? {};
    } catch {
      return {};
    }
  };
  const merged = { ...read(".env"), ...read(".env.local") };
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = value;
    }
  }
}
loadEnvFiles();

const APPLY = process.argv.includes("--apply");
const SOFT_DELETE_DAYS = 30;
const LOGIN_ATTEMPT_DAYS = 30;

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("用法: pnpm cleanup [--apply]\n默认 dry-run，仅打印将删除的数量。");
    return;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });
  const now = Date.now();
  const softDeleteBefore = new Date(now - SOFT_DELETE_DAYS * 86400_000);
  const attemptBefore = new Date(now - LOGIN_ATTEMPT_DAYS * 86400_000);

  try {
    const expiredSessions = await db.session.count({
      where: { expires: { lt: new Date() } },
    });
    const oldAttempts = await db.loginAttempt.count({
      where: { createdAt: { lt: attemptBefore } },
    });
    const oldArticles = await db.article.count({
      where: { deletedAt: { lt: softDeleteBefore } },
    });
    const oldRelays = await db.relay.count({
      where: { deletedAt: { lt: softDeleteBefore } },
    });
    const orphanMedia = await db.mediaAsset.count({
      where: {
        status: { in: ["UPLOADING", "REJECTED", "DELETED"] },
        createdAt: { lt: softDeleteBefore },
        avatarUser: { is: null },
        articleCovers: { none: {} },
      },
    });

    console.log("[cleanup] 计划清理:");
    console.log(`  过期会话: ${expiredSessions}`);
    console.log(`  旧登录尝试: ${oldAttempts}`);
    console.log(`  软删除文章(>30天): ${oldArticles}`);
    console.log(`  软删除接龙(>30天): ${oldRelays}`);
    console.log(`  孤儿/废弃媒体: ${orphanMedia}`);

    if (!APPLY) {
      console.log("[cleanup] dry-run 完成。加 --apply 执行删除。");
      return;
    }

    await db.session.deleteMany({ where: { expires: { lt: new Date() } } });
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: attemptBefore } } });
    await db.article.deleteMany({ where: { deletedAt: { lt: softDeleteBefore } } });
    await db.relay.deleteMany({ where: { deletedAt: { lt: softDeleteBefore } } });
    await db.mediaAsset.deleteMany({
      where: {
        status: { in: ["UPLOADING", "REJECTED", "DELETED"] },
        createdAt: { lt: softDeleteBefore },
        avatarUser: { is: null },
        articleCovers: { none: {} },
      },
    });
    console.log("[cleanup] 已应用清理。");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
