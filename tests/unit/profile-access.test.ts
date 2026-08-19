import { describe, expect, it } from "vitest";
import {
  canEditProfileField,
  canViewProfileField,
  persistProfilePermissions,
  profilePermissionCode,
  projectMemberProfile,
  resolveProfilePermissions,
} from "@/server/users/profile-access";

const memberRecord = {
  id: "member-1",
  username: "player",
  displayName: "队员甲",
  email: "player@example.com",
  role: "MEMBER" as const,
  teamTitle: "边前卫",
  staffTitle: null,
  signature: "冲",
  studentId: "U202012345",
  fieldPositions: ["ST"],
  preferredFoot: "RIGHT" as const,
  avatarAssetId: null,
  avatarUrl: null,
  status: "ACTIVE",
};

describe("profile access", () => {
  it("defaults hide others student id and email", () => {
    const granted = resolveProfilePermissions({ role: "MEMBER", profilePermissions: [] });
    expect(canViewProfileField(granted, "signature", false)).toBe(true);
    expect(canViewProfileField(granted, "studentId", false)).toBe(false);
    expect(canViewProfileField(granted, "email", false)).toBe(false);
    expect(canEditProfileField(granted, "studentId", true, "MEMBER")).toBe(true);
    expect(canEditProfileField(granted, "studentId", false, "MEMBER")).toBe(false);
  });

  it("captain can view and edit every field including others", () => {
    const granted = resolveProfilePermissions({ role: "CAPTAIN", profilePermissions: [] });
    expect(canViewProfileField(granted, "studentId", false)).toBe(true);
    expect(canEditProfileField(granted, "signature", false, "CAPTAIN")).toBe(true);
    expect(canEditProfileField(granted, "teamTitle", true, "CAPTAIN")).toBe(true);
  });

  it("empty configured list revokes default view", () => {
    const granted = resolveProfilePermissions({
      role: "MEMBER",
      profilePermissions: persistProfilePermissions([]),
    });
    expect(canViewProfileField(granted, "signature", false)).toBe(false);
  });

  it("projects member profile without leaking student id", () => {
    const projected = projectMemberProfile(memberRecord, {
      id: "viewer-1",
      role: "MEMBER",
      profilePermissions: [],
    });
    expect(projected.signature).toBe("冲");
    expect(projected.studentId).toBeUndefined();
    expect(projected.email).toBeUndefined();
  });

  it("allows granted edit-others student id", () => {
    const projected = projectMemberProfile(memberRecord, {
      id: "viewer-1",
      role: "STAFF",
      profilePermissions: persistProfilePermissions([
        profilePermissionCode("view", "studentId"),
        profilePermissionCode("edit-others", "studentId"),
      ]),
    });
    expect(projected.studentId).toBe("U202012345");
    expect(projected.canEdit.studentId).toBe(true);
  });
});
