import type { Role, StaffTitle } from "@/generated/prisma/enums";

export const PERMISSIONS = {
  USERS_READ: "users:read",
  USERS_REVIEW: "users:review",
  USERS_ROLES: "users:roles",
  ARTICLES_READ: "articles:read",
  ARTICLES_WRITE: "articles:write",
  ARTICLES_PUBLISH: "articles:publish",
  RELAYS_READ: "relays:read",
  RELAYS_WRITE: "relays:write",
  AUDIT_READ: "audit:read",
  MEDIA_UPLOAD: "media:upload",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.USERS_READ]: "查看成员审核",
  [PERMISSIONS.USERS_REVIEW]: "审核/停用成员",
  [PERMISSIONS.USERS_ROLES]: "调整角色与权限",
  [PERMISSIONS.ARTICLES_READ]: "查看后台动态",
  [PERMISSIONS.ARTICLES_WRITE]: "撰写/编辑动态",
  [PERMISSIONS.ARTICLES_PUBLISH]: "发布/置顶动态",
  [PERMISSIONS.RELAYS_READ]: "查看后台接龙",
  [PERMISSIONS.RELAYS_WRITE]: "管理活动接龙",
  [PERMISSIONS.AUDIT_READ]: "查看审计日志",
  [PERMISSIONS.MEDIA_UPLOAD]: "上传后台媒体",
};

export const PERMISSION_GROUPS: Array<{
  label: string;
  items: Permission[];
}> = [
  {
    label: "成员",
    items: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_REVIEW, PERMISSIONS.USERS_ROLES],
  },
  {
    label: "球队动态",
    items: [PERMISSIONS.ARTICLES_READ, PERMISSIONS.ARTICLES_WRITE, PERMISSIONS.ARTICLES_PUBLISH],
  },
  {
    label: "活动接龙",
    items: [PERMISSIONS.RELAYS_READ, PERMISSIONS.RELAYS_WRITE],
  },
  {
    label: "其他",
    items: [PERMISSIONS.AUDIT_READ, PERMISSIONS.MEDIA_UPLOAD],
  },
];

export const STAFF_TITLE_LABELS: Record<StaffTitle, string> = {
  COACH: "教练",
  VICE_CAPTAIN: "副队长",
  MANAGER: "经理",
};

export const STAFF_TITLE_PRESETS: Record<StaffTitle, Permission[]> = {
  COACH: [
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_WRITE,
    PERMISSIONS.RELAYS_READ,
    PERMISSIONS.RELAYS_WRITE,
    PERMISSIONS.MEDIA_UPLOAD,
  ],
  VICE_CAPTAIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_REVIEW,
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_WRITE,
    PERMISSIONS.ARTICLES_PUBLISH,
    PERMISSIONS.RELAYS_READ,
    PERMISSIONS.RELAYS_WRITE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.MEDIA_UPLOAD,
  ],
  MANAGER: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_REVIEW,
    PERMISSIONS.RELAYS_READ,
    PERMISSIONS.RELAYS_WRITE,
    PERMISSIONS.AUDIT_READ,
  ],
};

export function isPermission(code: string): code is Permission {
  return ALL_PERMISSIONS.includes(code as Permission);
}

export function normalizeGrantedPermissions(codes: string[]): Permission[] {
  const granted = new Set(codes.filter(isPermission));
  if (granted.has(PERMISSIONS.ARTICLES_WRITE) || granted.has(PERMISSIONS.ARTICLES_PUBLISH)) {
    granted.add(PERMISSIONS.ARTICLES_READ);
  }
  if (granted.has(PERMISSIONS.RELAYS_WRITE)) {
    granted.add(PERMISSIONS.RELAYS_READ);
  }
  if (granted.has(PERMISSIONS.USERS_REVIEW) || granted.has(PERMISSIONS.USERS_ROLES)) {
    granted.add(PERMISSIONS.USERS_READ);
  }
  return ALL_PERMISSIONS.filter((code) => granted.has(code));
}

export function resolveUserPermissions(input: {
  role: Role;
  staffTitle: StaffTitle | null;
  permissions: string[];
}): Permission[] {
  if (input.role === "CAPTAIN") return [...ALL_PERMISSIONS];
  return normalizeGrantedPermissions(input.permissions);
}

export function hasPermission(granted: Permission[], required: Permission | Permission[]): boolean {
  const codes = Array.isArray(required) ? required : [required];
  return codes.every((code) => granted.includes(code));
}

export function hasAnyPermission(granted: Permission[], required: Permission[]): boolean {
  return required.some((code) => granted.includes(code));
}

export function canAccessCaptainArea(granted: Permission[]): boolean {
  return granted.length > 0;
}

export function navItemsForPermissions(granted: Permission[], role?: Role) {
  const items: Array<{ href: string; label: string }> = [{ href: "/captain", label: "概览" }];
  if (
    hasAnyPermission(granted, [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_REVIEW,
      PERMISSIONS.USERS_ROLES,
    ])
  ) {
    items.push({ href: "/captain/users", label: "成员权限" });
  }
  if (
    hasAnyPermission(granted, [
      PERMISSIONS.ARTICLES_READ,
      PERMISSIONS.ARTICLES_WRITE,
      PERMISSIONS.ARTICLES_PUBLISH,
    ])
  ) {
    items.push({ href: "/captain/articles", label: "球队动态" });
  }
  if (hasAnyPermission(granted, [PERMISSIONS.RELAYS_READ, PERMISSIONS.RELAYS_WRITE])) {
    items.push({ href: "/captain/relays", label: "活动接龙" });
  }
  if (hasPermission(granted, PERMISSIONS.AUDIT_READ)) {
    items.push({ href: "/captain/audit", label: "审计日志" });
  }
  if (role === "CAPTAIN") {
    items.push({ href: "/captain/team", label: "球队信息" });
  }
  return items;
}
