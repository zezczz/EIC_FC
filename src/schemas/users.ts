import { z } from "zod";
import { routeUuidParam } from "@/schemas/common";

/** 队长用户管理 schema（ARCHITECTURE.md §11.6） */

export const uuidParamSchema = routeUuidParam;

export const rejectUserSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "拒绝原因不能为空")
    .max(500, "拒绝原因最多 500 字"),
});

export const suspendUserSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "停用原因不能为空")
    .max(500, "停用原因最多 500 字"),
});

export const restoreUserSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(["MEMBER", "STAFF", "CAPTAIN"]),
  staffTitle: z.enum(["COACH", "VICE_CAPTAIN", "MANAGER"]).nullable().optional(),
  permissions: z.array(z.string()).optional(),
  reason: z.string().trim().max(500).optional(),
});

export const updateStaffPermissionsSchema = z.object({
  staffTitle: z.enum(["COACH", "VICE_CAPTAIN", "MANAGER"]).nullable().optional(),
  permissions: z.array(z.string()).min(1, "至少选择一项权限"),
  reason: z.string().trim().max(500).optional(),
});

export const userListQuerySchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"]).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
