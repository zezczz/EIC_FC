import { z } from "zod";
import { FIELD_POSITIONS } from "@/lib/field-positions";

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "昵称不能为空").max(50).optional(),
  applicationMessage: z.string().trim().max(500).nullable().optional(),
  avatarAssetId: z.string().uuid().nullable().optional(),
  signature: z.string().trim().max(200).nullable().optional(),
  studentId: z.string().trim().max(32).nullable().optional(),
  fieldPositions: z.array(z.enum(FIELD_POSITIONS)).max(FIELD_POSITIONS.length).optional(),
  preferredFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).nullable().optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(10, "新密码至少 10 位").max(128),
    confirmPassword: z.string().min(10).max(128),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "两次输入的新密码不一致",
      });
    }
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
