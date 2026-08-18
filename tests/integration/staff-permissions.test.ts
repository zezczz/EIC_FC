import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { resolveUserPermissions, PERMISSIONS } from "@/server/auth/permissions";
import { changeUserRole } from "@/server/users/service";

describe("staff permissions", () => {
  let captainId = "";
  let memberId = "";

  beforeAll(async () => {
    await db.relayEntry.deleteMany();
    await db.relay.deleteMany();
    await db.user.deleteMany();
    const passwordHash = await hashPassword("captain-password-1");
    const captain = await db.user.create({
      data: {
        username: "permscaptain",
        usernameNormalized: "permscaptain",
        email: "permscaptain@example.com",
        emailNormalized: "permscaptain@example.com",
        passwordHash,
        displayName: "权限队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });
    const member = await db.user.create({
      data: {
        username: "permsmember",
        usernameNormalized: "permsmember",
        email: "permsmember@example.com",
        emailNormalized: "permsmember@example.com",
        passwordHash,
        displayName: "权限成员",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    captainId = captain.id;
    memberId = member.id;
  });

  it("assigns coach staff with preset permissions", async () => {
    await changeUserRole(memberId, captainId, "STAFF", { actorId: captainId, requestId: "perm-test" }, {
      staffTitle: "COACH",
    });
    const user = await db.user.findUnique({
      where: { id: memberId },
      select: { role: true, staffTitle: true, permissions: true },
    });
    expect(user?.role).toBe("STAFF");
    expect(user?.staffTitle).toBe("COACH");
    expect(resolveUserPermissions({
      role: user!.role,
      staffTitle: user!.staffTitle,
      permissions: user!.permissions,
    })).toContain(PERMISSIONS.RELAYS_WRITE);
  });
});
