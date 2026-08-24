export const PROFILE_FIELDS = [
  "displayName",
  "avatar",
  "signature",
  "studentId",
  "fieldPositions",
  "preferredFoot",
  "teamTitle",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  displayName: "昵称",
  avatar: "头像",
  signature: "个性签名",
  studentId: "学号",
  fieldPositions: "场上位置",
  preferredFoot: "惯用脚",
  teamTitle: "职务",
};

export const PROFILE_CONFIGURED = "profile:configured";

export type ProfileAccessKind = "view" | "edit-self" | "edit-others";

export function profilePermissionCode(kind: ProfileAccessKind, field: ProfileField): string {
  return `profile:${kind}:${field}`;
}

export const ALL_PROFILE_PERMISSIONS = PROFILE_FIELDS.flatMap((field) => [
  profilePermissionCode("view", field),
  profilePermissionCode("edit-self", field),
  profilePermissionCode("edit-others", field),
]);

const PUBLIC_VIEW_FIELDS: ProfileField[] = [
  "displayName",
  "avatar",
  "signature",
  "fieldPositions",
  "preferredFoot",
  "teamTitle",
];

const DEFAULT_SELF_EDIT_FIELDS: ProfileField[] = [
  "displayName",
  "avatar",
  "signature",
  "studentId",
  "fieldPositions",
  "preferredFoot",
];

export const DEFAULT_PROFILE_PERMISSIONS = [
  ...PUBLIC_VIEW_FIELDS.map((field) => profilePermissionCode("view", field)),
  ...DEFAULT_SELF_EDIT_FIELDS.map((field) => profilePermissionCode("edit-self", field)),
];

export function isProfilePermission(code: string): boolean {
  return code === PROFILE_CONFIGURED || ALL_PROFILE_PERMISSIONS.includes(code);
}

export function resolveProfilePermissions(input: {
  role: "MEMBER" | "STAFF" | "CAPTAIN";
  profilePermissions: string[];
}): string[] {
  if (input.role === "CAPTAIN") {
    return [PROFILE_CONFIGURED, ...ALL_PROFILE_PERMISSIONS];
  }
  const stored = input.profilePermissions.filter(isProfilePermission);
  if (!stored.includes(PROFILE_CONFIGURED)) {
    return DEFAULT_PROFILE_PERMISSIONS;
  }
  return stored.filter((code) => code !== PROFILE_CONFIGURED);
}

export function persistProfilePermissions(codes: string[]): string[] {
  const unique = [...new Set(codes.filter((code) => ALL_PROFILE_PERMISSIONS.includes(code)))];
  return [PROFILE_CONFIGURED, ...unique];
}

export function canViewProfileField(
  granted: string[],
  field: ProfileField,
  isSelf: boolean,
): boolean {
  if (isSelf) return true;
  return granted.includes(profilePermissionCode("view", field));
}

export function canEditProfileField(
  granted: string[],
  field: ProfileField,
  isSelf: boolean,
  viewerRole: "MEMBER" | "STAFF" | "CAPTAIN",
): boolean {
  if (field === "teamTitle") return viewerRole === "CAPTAIN";
  if (isSelf) return granted.includes(profilePermissionCode("edit-self", field));
  return granted.includes(profilePermissionCode("edit-others", field));
}

export type MemberProfileRecord = {
  id: string;
  username: string;
  displayName: string;
  role: "MEMBER" | "STAFF" | "CAPTAIN";
  teamTitle: string | null;
  staffTitle: "COACH" | "VICE_CAPTAIN" | "MANAGER" | null;
  signature: string | null;
  studentId: string | null;
  fieldPositions: string[];
  preferredFoot: "LEFT" | "RIGHT" | "BOTH" | null;
  avatarAssetId: string | null;
  avatarUrl: string | null;
  status: string;
};

export type ProjectedMemberProfile = {
  id: string;
  username: string;
  displayName: string;
  role: "MEMBER" | "STAFF" | "CAPTAIN";
  status: string;
  avatarUrl: string | null;
  teamTitle: string | null;
  staffTitle: "COACH" | "VICE_CAPTAIN" | "MANAGER" | null;
  signature?: string | null;
  studentId?: string | null;
  fieldPositions?: string[];
  preferredFoot?: "LEFT" | "RIGHT" | "BOTH" | null;
  avatarAssetId?: string | null;
  canEdit: Partial<Record<ProfileField, boolean>>;
};

export function projectMemberProfile(
  record: MemberProfileRecord,
  viewer: { id: string; role: "MEMBER" | "STAFF" | "CAPTAIN"; profilePermissions: string[] },
): ProjectedMemberProfile {
  const isSelf = viewer.id === record.id;
  const granted = resolveProfilePermissions({
    role: viewer.role,
    profilePermissions: viewer.profilePermissions,
  });
  const projected: ProjectedMemberProfile = {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    role: record.role,
    status: record.status,
    avatarUrl: canViewProfileField(granted, "avatar", isSelf) ? record.avatarUrl : null,
    teamTitle: canViewProfileField(granted, "teamTitle", isSelf) ? record.teamTitle : null,
    staffTitle: record.staffTitle,
    canEdit: {},
  };

  if (canViewProfileField(granted, "signature", isSelf)) projected.signature = record.signature;
  if (canViewProfileField(granted, "studentId", isSelf)) projected.studentId = record.studentId;
  if (canViewProfileField(granted, "fieldPositions", isSelf)) {
    projected.fieldPositions = record.fieldPositions;
  }
  if (canViewProfileField(granted, "preferredFoot", isSelf)) {
    projected.preferredFoot = record.preferredFoot;
  }
  if (canViewProfileField(granted, "avatar", isSelf)) {
    projected.avatarAssetId = record.avatarAssetId;
  }

  for (const field of PROFILE_FIELDS) {
    projected.canEdit[field] = canEditProfileField(granted, field, isSelf, viewer.role);
  }
  return projected;
}
