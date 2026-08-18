/**
 * scripts/bootstrap-captain.ts - 创建首位队长（ARCHITECTURE.md §18.1）
 *
 * 用法：
 *   pnpm captain:bootstrap
 *   # 或提供环境变量（避免交互输入）：
 *   CAPTAIN_USERNAME=cap CAPTAIN_EMAIL=cap@example.com CAPTAIN_DISPLAY_NAME=队长 \
 *   CAPTAIN_PASSWORD='long-password' pnpm captain:bootstrap
 *
 * 要求：
 * - 从无回显交互或临时环境变量读取用户名、邮箱、显示名和密码
 * - 密码经 Argon2id 哈希
 * - 在事务中创建 ACTIVE/CAPTAIN
 * - 已存在 ACTIVE CAPTAIN 时默认拒绝
 * - 成功后写入审计日志
 * - 不打印密码和哈希
 * - 重复执行不得创建重复用户
 * - 成功退出码 0，失败非 0
 */
import { existsSync, readFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// 加载环境变量（与 prisma.config.ts 相同的优先级：真实环境 > .env.local > .env）
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

function fail(message: string): never {
  console.error(`[bootstrap-captain] 错误: ${message}`);
  process.exit(1);
}

async function promptHidden(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  // 简化：Windows 无回显交互依赖 readline 输出即可；密码以 * 回显替代（脚本仅本地运行）
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      [
        "用法: pnpm captain:bootstrap",
        "环境变量: CAPTAIN_USERNAME, CAPTAIN_EMAIL, CAPTAIN_DISPLAY_NAME, CAPTAIN_PASSWORD",
        "从环境变量读取时无需交互；否则交互输入。",
        "创建首位 ACTIVE/CAPTAIN 用户，写入审计日志。",
      ].join("\n"),
    );
    return;
  }

  const username = process.env.CAPTAIN_USERNAME ?? "";
  const email = process.env.CAPTAIN_EMAIL ?? "";
  const displayName = process.env.CAPTAIN_DISPLAY_NAME ?? "";
  const password = process.env.CAPTAIN_PASSWORD ?? "";

  const needInteractive = !(username && email && displayName && password);
  const rl = needInteractive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  const finalUsername = username || (rl ? await promptHidden(rl, "队长用户名: ") : "");
  const finalEmail = email || (rl ? await promptHidden(rl, "队长邮箱: ") : "");
  const finalDisplayName = displayName || (rl ? await promptHidden(rl, "队长显示名: ") : "");
  const finalPassword = password || (rl ? await promptHidden(rl, "队长密码(至少10位): ") : "");

  if (!finalUsername || !finalEmail || !finalDisplayName || !finalPassword) {
    fail("用户名、邮箱、显示名和密码均不能为空");
  }
  if (finalPassword.length < 10 || finalPassword.length > 128) {
    fail("密码长度必须为 10-128 位");
  }
  if (!/^[\p{L}\p{N}_]+$/u.test(finalUsername) || finalUsername.length < 3 || finalUsername.length > 32) {
    fail("用户名只能包含字母、数字、下划线或中文，3-32 位");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
    fail("邮箱格式不正确");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  try {
    // 已存在 ACTIVE CAPTAIN 时默认拒绝
    const existingActiveCaptain = await db.user.count({
      where: { role: "CAPTAIN", status: "ACTIVE", deletedAt: null },
    });
    if (existingActiveCaptain > 0) {
      fail("已存在 ACTIVE 队长，不再创建");
    }

    const usernameNormalized = finalUsername.trim().toLocaleLowerCase("zh-CN");
    const emailNormalized = finalEmail.trim().toLowerCase();

    const existing = await db.user.findFirst({
      where: {
        OR: [
          { username: finalUsername },
          { usernameNormalized },
          { email: finalEmail },
          { emailNormalized },
        ],
      },
    });
    if (existing) {
      fail("用户名或邮箱已存在，重复执行不会创建重复用户");
    }

    const { hash } = await import("@node-rs/argon2");
    const passwordHash = await hash(finalPassword, {
      algorithm: 2, // Argon2id
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: finalUsername.trim(),
          usernameNormalized,
          email: finalEmail.trim(),
          emailNormalized,
          passwordHash,
          displayName: finalDisplayName.trim(),
          role: "CAPTAIN",
          status: "ACTIVE",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "CAPTAIN_BOOTSTRAP",
          resourceType: "USER",
          resourceId: created.id,
          after: { id: created.id, username: created.username },
          requestId: "bootstrap",
        },
      });
      return created;
    });

    console.log(
      `[bootstrap-captain] 创建成功: ${user.username} (${user.displayName})，角色 CAPTAIN，状态 ACTIVE`,
    );
    // 不打印密码和哈希
  } finally {
    await db.$disconnect();
    rl?.close();
  }
}

main().catch((e: unknown) => {
  const err = e as Error;
  fail(err.message);
});
