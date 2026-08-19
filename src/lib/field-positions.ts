export const FIELD_POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "WB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
] as const;

export type FieldPosition = (typeof FIELD_POSITIONS)[number];

export const FIELD_POSITION_LABELS: Record<FieldPosition, string> = {
  GK: "门将",
  CB: "中后卫",
  LB: "左后卫",
  RB: "右后卫",
  WB: "边翼卫",
  CDM: "后腰",
  CM: "中场",
  CAM: "前腰",
  LM: "左边场",
  RM: "右边场",
  LW: "左边锋",
  RW: "右边锋",
  CF: "影锋",
  ST: "中锋",
};

export function isFieldPosition(value: string): value is FieldPosition {
  return FIELD_POSITIONS.includes(value as FieldPosition);
}

export const PREFERRED_FOOT_LABELS = {
  LEFT: "左脚",
  RIGHT: "右脚",
  BOTH: "两脚均衡",
} as const;
