import { z } from "zod";
import { routeUuidParam } from "@/schemas/common";

export const relayIdSchema = routeUuidParam;

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

const relayBaseSchema = z.object(relayFields);

export const relayCreateSchema = relayBaseSchema.superRefine(validateDates);

export const relayUpdateSchema = relayBaseSchema
  .partial()
  .extend({ version: z.number().int().positive() })
  .superRefine(validateDates);

export const relayEntrySchema = z.object({
  response: z.enum(["JOINED", "DECLINED"]).default("JOINED"),
  participantCount: z.number().int().min(1).max(20).default(1),
  note: z.string().trim().max(300).nullable().optional(),
});

export const relayListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED", "FINISHED"]).optional(),
});

export type RelayCreateInput = z.infer<typeof relayCreateSchema>;
export type RelayUpdateInput = z.infer<typeof relayUpdateSchema>;
export type RelayEntryInput = z.infer<typeof relayEntrySchema>;
