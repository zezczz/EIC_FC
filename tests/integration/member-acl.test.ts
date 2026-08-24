import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { getMemberProfile, updateProfile } from "@/server/users/profile";
import { persistProfilePermissions, profilePermissionCode } from "@/server/users/profile-access";

describe("member profile ACL", () => {
  let captainId = "";
  let memberId = "";
  let viewerId = "";

  beforeAll(async () => {
    await db.relayEntry.deleteMany();
    await db.relay.deleteMany();
    await db.article.deleteMany();
    await db.user.deleteMany();
    const passwordHash = await hashPassword("acl-password-1");
    const captain = await db.user.create({
      data: {
        username: "aclcaptain",
        usernameNormalized: "aclcaptain",
        passwordHash,
        displayName: "ACL队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });
    const member = await db.user.create({
      data: {
        username: "aclmember",
        usernameNormalized: "aclmember",
        passwordHash,
        displayName: "ACL队员",
        role: "MEMBER",
        status: "ACTIVE",
        studentId: "U2020999",
        signature: "签名",
      },
    });
    const viewer = await db.user.create({
      data: {
        username: "aclviewer",
        usernameNormalized: "aclviewer",
        passwordHash,
        displayName: "ACL观众",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    captainId = captain.id;
    memberId = member.id;
    viewerId = viewer.id;
  });

  it("hides student id from other members by default", async () => {
    const profile = await getMemberProfile(memberId, viewerId);
    expect(profile.signature).toBe("签名");
    expect(profile.studentId).toBeUndefined();
  });

  it("shows student id to captains", async () => {
    const profile = await getMemberProfile(memberId, captainId);
    expect(profile.studentId).toBe("U2020999");
  });

  it("rejects unauthorized edits of other members", async () => {
    await expect(
      updateProfile(memberId, { signature: "被改" }, { actorId: viewerId, requestId: "acl-deny" }),
    ).rejects.toThrow();
  });

  it("allows granted edit-others", async () => {
    await db.user.update({
      where: { id: viewerId },
      data: {
        profilePermissions: persistProfilePermissions([
          profilePermissionCode("view", "signature"),
          profilePermissionCode("edit-others", "signature"),
        ]),
      },
    });
    const updated = await updateProfile(
      memberId,
      { signature: "授权后的签名" },
      { actorId: viewerId, requestId: "acl-allow" },
    );
    expect(updated.signature).toBe("授权后的签名");
  });
});
