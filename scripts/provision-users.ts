/**
 * scripts/provision-users.ts - 幂等写入队员账号（不打印密码）
 *
 * 从 stdin 读取 JSON 数组：
 *   [{ "username": "captain", "password": "...", "role": "CAPTAIN", "staffTitle": null, "displayName": "captain" }]
 *
 * role: CAPTAIN | STAFF | MEMBER
 * staffTitle: COACH | VICE_CAPTAIN | MANAGER | null
 */
import { existsSync, readFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role, StaffTitle } from "../src/generated/prisma/enums";

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
  console.error(`[provision-users] 错误: ${message}`);
  process.exit(1);
}

const VICE_CAPTAIN_PERMISSIONS = [
  "users:read",
  "users:review",
  "articles:read",
  "articles:write",
  "articles:publish",
  "relays:read",
  "relays:write",
  "audit:read",
  "media:upload",
];

const COACH_PERMISSIONS = [
  "articles:read",
  "articles:write",
  "relays:read",
  "relays:write",
  "media:upload",
];

const MANAGER_PERMISSIONS = [
  "users:read",
  "users:review",
  "relays:read",
  "relays:write",
  "audit:read",
];

type ProvisionUser = {
  username: string;
  password: string;
  role: Role;
  staffTitle?: StaffTitle | null;
  displayName?: string;
};

function permissionsFor(role: Role, staffTitle: StaffTitle | null): string[] {
  if (role === "CAPTAIN") return [];
  if (role === "STAFF") {
    if (staffTitle === "VICE_CAPTAIN") return [...VICE_CAPTAIN_PERMISSIONS];
    if (staffTitle === "COACH") return [...COACH_PERMISSIONS];
    if (staffTitle === "MANAGER") return [...MANAGER_PERMISSIONS];
  }
  return [];
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseUsers(raw: string): ProvisionUser[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    fail("stdin 必须是合法 JSON 数组");
  }
  if (!Array.isArray(data) || data.length === 0) {
    fail("stdin 必须是非空 JSON 数组");
  }
  return data.map((item, index) => {
    if (!item || typeof item !== "object") fail(`第 ${index + 1} 项不是对象`);
    const row = item as Record<string, unknown>;
    const username = String(row.username ?? "").trim();
    const password = String(row.password ?? "");
    const role = String(row.role ?? "") as Role;
    const staffTitle = (row.staffTitle ?? null) as StaffTitle | null;
    const displayName = String(row.displayName ?? username).trim();
    if (!username) fail(`第 ${index + 1} 项缺少 username`);
    if (!password) fail(`第 ${index + 1} 项缺少 password`);
    if (!["CAPTAIN", "STAFF", "MEMBER"].includes(role)) {
      fail(`第 ${index + 1} 项 role 无效`);
    }
    return { username, password, role, staffTitle, displayName };
  });
}

async function main() {
  const raw = await readStdin();
  const users = parseUsers(raw);
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });
  const { hash } = await import("@node-rs/argon2");

  try {
    for (const input of users) {
      const usernameNormalized = input.username.toLocaleLowerCase("zh-CN");
      const passwordHash = await hash(input.password, {
        algorithm: 2,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
      const staffTitle = input.role === "STAFF" ? (input.staffTitle ?? null) : null;
      const permissions = permissionsFor(input.role, staffTitle);
      const displayName = input.displayName || input.username;

      const existing = await db.user.findFirst({
        where: { OR: [{ username: input.username }, { usernameNormalized }] },
      });

      if (existing) {
        await db.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            displayName,
            role: input.role,
            staffTitle,
            permissions,
            status: "ACTIVE",
            deletedAt: null,
          },
        });
        console.log(`[provision-users] 已更新: ${input.username} (${input.role})`);
      } else {
        await db.user.create({
          data: {
            username: input.username,
            usernameNormalized,
            passwordHash,
            displayName,
            role: input.role,
            staffTitle,
            permissions,
            status: "ACTIVE",
          },
        });
        console.log(`[provision-users] 已创建: ${input.username} (${input.role})`);
      }
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e: unknown) => {
  const err = e as Error;
  fail(err.message);
});
