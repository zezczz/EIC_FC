import { z } from "zod";

/**
 * 认证相关输入 schema（ARCHITECTURE.md §11.2、§15.1）。
 */

/** 用户名：字母、数字、下划线和中文，3-32 位 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少 3 个字符")
  .max(32, "用户名最多 32 个字符")
  .regex(/^[\p{L}\p{N}_]+$/u, "用户名只能包含字母、数字、下划线或中文");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("邮箱格式不正确")
  .max(254, "邮箱过长");

export const passwordSchema = z
  .string()
  .min(10, "密码至少 10 位")
  .max(128, "密码最多 128 位");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "昵称不能为空")
  .max(50, "昵称最多 50 个字符");

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    displayName: displayNameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    applicationMessage: z.string().trim().max(500, "申请留言最多 500 字").optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** 登录身份：用户名或邮箱（不区分大小写） */
export const loginSchema = z.object({
  identity: z.string().trim().min(1, "请输入用户名或邮箱").max(254),
  password: z.string().min(1, "请输入密码").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
