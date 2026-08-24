import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, hashSessionToken } from "@/server/auth/session";
import { createMemberByCaptain, approveUser, rejectUser } from "@/server/users/service";
import { db } from "@/server/db";

/**
 * 集成测试：队长开通队员、审核遗留 PENDING、登录会话。
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

  it("队长直接创建队员为 ACTIVE", async () => {
    const passwordHash = await hashPassword("captain-password-1");
    const captain = await db.user.create({
      data: {
        username: "captain1",
        usernameNormalized: "captain1",
        passwordHash,
        displayName: "队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });

    const member = await createMemberByCaptain(
      {
        username: "player01",
        displayName: "球员",
        password: "player-password",
      },
      captain.id,
      {
        actorId: captain.id,
        requestId: "test_create_member",
        ip: "127.0.0.1",
      },
    );
    expect(member.status).toBe("ACTIVE");

    const refreshed = await db.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(refreshed.role).toBe("MEMBER");
    expect(refreshed.reviewedById).toBe(captain.id);
  });

  it("遗留 PENDING 用户经队长批准后为 ACTIVE", async () => {
    const captain = await db.user.findFirstOrThrow({
      where: { role: "CAPTAIN", status: "ACTIVE" },
    });
    const passwordHash = await hashPassword("player-password");
    const pending = await db.user.create({
      data: {
        username: "player-pending",
        usernameNormalized: "player-pending",
        passwordHash,
        displayName: "待审球员",
        role: "MEMBER",
        status: "PENDING",
      },
    });

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
    const passwordHash = await hashPassword("player-password");
    const user = await db.user.create({
      data: {
        username: "player02",
        usernameNormalized: "player02",
        passwordHash,
        displayName: "球员2",
        role: "MEMBER",
        status: "PENDING",
      },
    });
    await createSession(user.id);
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
