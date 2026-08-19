/**
 * 开发环境演示种子（ARCHITECTURE.md §9）。
 * 生产环境禁止使用默认密码；正式队长请用 `pnpm captain:bootstrap`。
 */
import { existsSync, readFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "@node-rs/argon2";

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

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("[seed] 禁止在生产环境执行种子脚本");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  try {
    const existing = await db.article.count();
    if (existing > 0) {
      console.log("[seed] 已有文章数据，跳过");
      return;
    }

    let captain = await db.user.findFirst({
      where: { role: "CAPTAIN", status: "ACTIVE", deletedAt: null },
    });

    if (!captain) {
      const passwordHash = await hash("dev-captain-password", {
        algorithm: 2,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
      captain = await db.user.create({
        data: {
          username: "devcaptain",
          usernameNormalized: "devcaptain",
          email: "dev-captain@example.com",
          emailNormalized: "dev-captain@example.com",
          passwordHash,
          displayName: "开发队长",
          role: "CAPTAIN",
          status: "ACTIVE",
        },
      });
      console.log("[seed] 创建开发队长: devcaptain / dev-captain-password");
    }

    await db.teamProfile.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        name: "EIC FC",
        subtitle: "华科电信足球队",
        honors: "",
        summary: "与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。",
                },
              ],
            },
          ],
        },
        plainText: "与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。",
      },
    });

    await db.article.create({
      data: {
        slug: "welcome-to-eic-fc",
        title: "欢迎来到 EIC FC",
        summary: "球队官网已上线，欢迎浏览动态并申请加入。",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "欢迎来到 EIC FC 球队官网。" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "注册后请等待队长审核，通过后即可参加活动接龙。" }],
            },
          ],
        },
        plainText: "欢迎来到 EIC FC 球队官网。注册后请等待队长审核，通过后即可参加活动接龙。",
        status: "PUBLISHED",
        authorId: captain.id,
        publishedById: captain.id,
        publishedAt: new Date(),
      },
    });

    console.log("[seed] 已创建示例球队动态");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
