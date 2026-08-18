import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { updateProfile } from "@/server/users/profile";

describe("profile flow", () => {
  let userId = "";

  beforeAll(async () => {
    await db.relayEntry.deleteMany();
    await db.relay.deleteMany();
    await db.user.deleteMany();
    const passwordHash = await hashPassword("member-password-1");
    const user = await db.user.create({
      data: {
        username: "profilemember",
        usernameNormalized: "profilemember",
        email: "profilemember@example.com",
        emailNormalized: "profilemember@example.com",
        passwordHash,
        displayName: "资料成员",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  });

  it("updates display name", async () => {
    const updated = await updateProfile(
      userId,
      { displayName: "资料测试昵称" },
      { actorId: userId, requestId: "profile-test" },
    );
    expect(updated.displayName).toBe("资料测试昵称");
  });
});
