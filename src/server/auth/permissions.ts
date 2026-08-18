import type { StaffTitle } from "@/generated/prisma/enums";

export const PERMISSIONS = {
  USERS_REVIEW: "users:review",
  USERS_ROLES: "users:roles",
  ARTICLES_WRITE: "articles:write",
  ARTICLES_PUBLISH: "articles:publish",
  RELAYS_WRITE: "relays:write",
  AUDIT_READ: "audit:read",
  MEDIA_UPLOAD: "media:upload",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const STAFF_TITLE_LABELS: Record<StaffTitle, string> = {
  COACH: "教练",
  VICE_CAPTAIN: "副队长",
  MANAGER: "经理",
};

export const STAFF_TITLE_PRESETS: Record<StaffTitle, Permission[]> = {
  COACH: [PERMISSIONS.RELAYS_WRITE, PERMISSIONS.ARTICLES_WRITE, PERMISSIONS.MEDIA_UPLOAD],
  VICE_CAPTAIN: [
    PERMISSIONS.USERS_REVIEW,
    PERMISSIONS.ARTICLES_WRITE,
    PERMISSIONS.ARTICLES_PUBLISH,
    PERMISSIONS.RELAYS_WRITE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.MEDIA_UPLOAD,
  ],
  MANAGER: [PERMISSIONS.USERS_REVIEW, PERMISSIONS.AUDIT_READ, PERMISSIONS.RELAYS_WRITE],
};

export function resolveUserPermissions(input: {
  role: "MEMBER" | "STAFF" | "CAPTAIN";
  staffTitle: StaffTitle | null;
  permissions: string[];
}): Permission[] {
  if (input.role === "CAPTAIN") return [...ALL_PERMISSIONS];
  if (input.role !== "STAFF") return [];
  if (input.permissions.length > 0) {
    return input.permissions.filter((code): code is Permission =>
      ALL_PERMISSIONS.includes(code as Permission),
    );
  }
  if (input.staffTitle) return [...STAFF_TITLE_PRESETS[input.staffTitle]];
  return [];
}

export function hasPermission(
  granted: Permission[],
  required: Permission | Permission[],
): boolean {
  const codes = Array.isArray(required) ? required : [required];
  return codes.every((code) => granted.includes(code));
}

export function hasAnyPermission(
  granted: Permission[],
  required: Permission[],
): boolean {
  return required.some((code) => granted.includes(code));
}

export function canAccessCaptainArea(granted: Permission[]): boolean {
  return granted.length > 0;
}

export function navItemsForPermissions(granted: Permission[]) {
  const items: Array<{ href: string; label: string }> = [{ href: "/captain", label: "概览" }];
  if (hasPermission(granted, PERMISSIONS.USERS_REVIEW)) {
    items.push({ href: "/captain/users", label: "成员审核" });
  }
  if (hasAnyPermission(granted, [PERMISSIONS.ARTICLES_WRITE, PERMISSIONS.ARTICLES_PUBLISH])) {
    items.push({ href: "/captain/articles", label: "球队动态" });
  }
  if (hasPermission(granted, PERMISSIONS.RELAYS_WRITE)) {
    items.push({ href: "/captain/relays", label: "活动接龙" });
  }
  if (hasPermission(granted, PERMISSIONS.AUDIT_READ)) {
    items.push({ href: "/captain/audit", label: "审计日志" });
  }
  return items;
}
