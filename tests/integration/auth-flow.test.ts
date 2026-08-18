import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { registerUser } from "@/server/auth/service";
import { approveUser, rejectUser } from "@/server/users/service";
import { db } from "@/server/db";
import { hashSessionToken } from "@/server/auth/session";

/**
 * 集成测试：注册 → 审核 → 登录会话。
 * 需要本地 PostgreSQL（compose.dev 或 CI service）。
 */
describe("auth approval flow", () => {
  beforeAll(async () => {
    await db.relayEntry.deleteMany();
    await db.relay.deleteMany();
    await db.article.deleteMany();
    await db.session.deleteMany();
    await db.loginAttempt.deleteMany();
    await db.auditLog.deleteMany();
    await db.user.deleteMany();
  });

  it("注册为 PENDING，队长批准后为 ACTIVE", async () => {
    const passwordHash = await hashPassword("captain-password-1");
    const captain = await db.user.create({
      data: {
        username: "captain1",
        usernameNormalized: "captain1",
        email: "captain1@example.com",
        emailNormalized: "captain1@example.com",
        passwordHash,
        displayName: "队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });

    const pending = await registerUser(
      {
        username: "player01",
        email: "player01@example.com",
        displayName: "球员",
        password: "player-password",
        confirmPassword: "player-password",
      },
      "127.0.0.1",
    );
    expect(pending.status).toBe("PENDING");

    await approveUser(pending.id, captain.id, {
      actorId: captain.id,
      requestId: "test_approve",
      ip: "127.0.0.1",
    });

    const refreshed = await db.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(refreshed.status).toBe("ACTIVE");
  });

  it("拒绝后撤销会话", async () => {
    const captain = await db.user.findFirstOrThrow({
      where: { role: "CAPTAIN", status: "ACTIVE" },
    });
    const user = await registerUser(
      {
        username: "player02",
        email: "player02@example.com",
        displayName: "球员2",
        password: "player-password",
        confirmPassword: "player-password",
      },
      "127.0.0.2",
    );
    const sessionsBefore = await db.session.count({ where: { userId: user.id } });
    expect(sessionsBefore).toBeGreaterThan(0);

    await rejectUser(user.id, captain.id, "资料不全", {
      actorId: captain.id,
      requestId: "test_reject",
      ip: "127.0.0.1",
    });

    const sessionsAfter = await db.session.count({ where: { userId: user.id } });
    expect(sessionsAfter).toBe(0);
  });

  it("密码哈希可验证", async () => {
    const hash = await hashPassword("abcdef12345");
    expect(await verifyPassword("abcdef12345", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("会话 token 哈希稳定", () => {
    const a = hashSessionToken("raw-token-example");
    const b = hashSessionToken("raw-token-example");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
