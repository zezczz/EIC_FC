import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  STAFF_TITLE_PRESETS,
  hasPermission,
  resolveUserPermissions,
} from "@/server/auth/permissions";

describe("permissions", () => {
  it("captain has all permissions", () => {
    const granted = resolveUserPermissions({
      role: "CAPTAIN",
      staffTitle: null,
      permissions: [],
    });
    expect(granted).toEqual(ALL_PERMISSIONS);
  });

  it("empty permissions mean no access even for staff", () => {
    const granted = resolveUserPermissions({
      role: "STAFF",
      staffTitle: "COACH",
      permissions: [],
    });
    expect(granted).toEqual([]);
  });

  it("staff stored permissions are used as-is with implied reads", () => {
    const granted = resolveUserPermissions({
      role: "STAFF",
      staffTitle: "COACH",
      permissions: [PERMISSIONS.AUDIT_READ],
    });
    expect(granted).toEqual([PERMISSIONS.AUDIT_READ]);
  });

  it("write permissions imply matching read permissions", () => {
    const granted = resolveUserPermissions({
      role: "MEMBER",
      staffTitle: null,
      permissions: [PERMISSIONS.ARTICLES_WRITE, PERMISSIONS.RELAYS_WRITE],
    });
    expect(granted).toEqual([
      PERMISSIONS.ARTICLES_READ,
      PERMISSIONS.ARTICLES_WRITE,
      PERMISSIONS.RELAYS_READ,
      PERMISSIONS.RELAYS_WRITE,
    ]);
  });

  it("member has no permissions by default", () => {
    expect(
      hasPermission(
        resolveUserPermissions({ role: "MEMBER", staffTitle: null, permissions: [] }),
        PERMISSIONS.RELAYS_WRITE,
      ),
    ).toBe(false);
  });

  it("coach preset still includes relay write", () => {
    expect(STAFF_TITLE_PRESETS.COACH).toContain(PERMISSIONS.RELAYS_WRITE);
  });
});
