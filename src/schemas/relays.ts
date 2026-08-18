import { z } from "zod";
import { routeUuidParam } from "@/schemas/common";

export const relayIdSchema = routeUuidParam;

const companionNameSchema = z.string().trim().min(1, "姓名不能为空").max(50, "姓名过长");

const relayFields = {
  title: z.string().trim().min(1, "标题不能为空").max(120),
  description: z.string().trim().max(2000),
  eventAt: z.coerce.date(),
  eventEndsAt: z.coerce.date().nullable().optional(),
  location: z.string().trim().min(1, "地点不能为空").max(200),
  signupDeadline: z.coerce.date(),
  capacity: z.number().int().positive().nullable().optional(),
  waitlistEnabled: z.boolean().default(true),
};

function validateDates(
  value: { eventAt?: Date; eventEndsAt?: Date | null; signupDeadline?: Date },
  ctx: z.RefinementCtx,
) {
  if (value.eventAt && value.signupDeadline && value.signupDeadline > value.eventAt) {
    ctx.addIssue({
      code: "custom",
      path: ["signupDeadline"],
      message: "报名截止时间不能晚于活动时间",
    });
  }
  if (value.eventAt && value.eventEndsAt && value.eventEndsAt <= value.eventAt) {
    ctx.addIssue({
      code: "custom",
      path: ["eventEndsAt"],
      message: "结束时间必须晚于活动开始时间",
    });
  }
}

function validateCompanionNames(
  value: { response: "JOINED" | "DECLINED"; participantCount: number; companionNames: string[] },
  ctx: z.RefinementCtx,
) {
  const expected = value.participantCount - 1;
  if (value.response === "JOINED") {
    if (value.companionNames.length !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["companionNames"],
        message:
          expected === 0
            ? "仅本人参加时不需填写同行人员"
            : `请填写 ${expected} 位同行人员姓名`,
      });
    }
    return;
  }
  if (value.companionNames.length > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["companionNames"],
      message: "无法参加时无需填写同行人员",
    });
  }
}

const relayBaseSchema = z.object(relayFields);

export const relayCreateSchema = relayBaseSchema.superRefine(validateDates);

export const relayUpdateSchema = relayBaseSchema
  .partial()
  .extend({ version: z.number().int().positive() })
  .superRefine(validateDates);

export const relayEntrySchema = z
  .object({
    response: z.enum(["JOINED", "DECLINED"]).default("JOINED"),
    participantCount: z.number().int().min(1).max(20).default(1),
    companionNames: z.array(companionNameSchema).default([]),
    note: z.string().trim().max(300).nullable().optional(),
  })
  .superRefine(validateCompanionNames);

export const relayListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED", "FINISHED"]).optional(),
  deleted: z.coerce.boolean().default(false),
});

export type RelayCreateInput = z.infer<typeof relayCreateSchema>;
export type RelayUpdateInput = z.infer<typeof relayUpdateSchema>;
export type RelayEntryInput = z.infer<typeof relayEntrySchema>;
