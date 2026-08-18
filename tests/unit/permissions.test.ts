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

  it("staff uses preset when permissions empty", () => {
    const granted = resolveUserPermissions({
      role: "STAFF",
      staffTitle: "COACH",
      permissions: [],
    });
    expect(granted).toEqual(STAFF_TITLE_PRESETS.COACH);
  });

  it("staff custom permissions override preset", () => {
    const granted = resolveUserPermissions({
      role: "STAFF",
      staffTitle: "COACH",
      permissions: [PERMISSIONS.AUDIT_READ],
    });
    expect(granted).toEqual([PERMISSIONS.AUDIT_READ]);
  });

  it("member has no permissions", () => {
    expect(
      hasPermission(
        resolveUserPermissions({ role: "MEMBER", staffTitle: null, permissions: [] }),
        PERMISSIONS.RELAYS_WRITE,
      ),
    ).toBe(false);
  });
});
