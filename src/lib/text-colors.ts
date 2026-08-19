export const TEXT_COLOR_TOKENS = ["red", "orange", "green", "blue", "purple"] as const;

export type TextColorToken = (typeof TEXT_COLOR_TOKENS)[number];

export const TEXT_COLOR_LABELS: Record<TextColorToken, string> = {
  red: "红",
  orange: "橙",
  green: "绿",
  blue: "蓝",
  purple: "紫",
};

export function isTextColorToken(value: unknown): value is TextColorToken {
  return typeof value === "string" && TEXT_COLOR_TOKENS.includes(value as TextColorToken);
}
