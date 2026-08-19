import { z } from "zod";
import { articleContentSchema, coverUrlSchema } from "@/schemas/articles";
import { routeUuidParam } from "@/schemas/common";

export const teamImageInputSchema = z.object({
  assetId: z.string().uuid(),
  caption: z.string().trim().max(120).nullable().optional(),
});

export const teamProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, "队名不能为空").max(80),
  subtitle: z.string().trim().max(80).nullable().optional(),
  contact: z.string().trim().max(300).nullable().optional(),
  honors: z.string().trim().max(2000),
  summary: z.string().trim().max(500),
  contentJson: articleContentSchema,
  crestAssetId: z.string().uuid().nullable().optional(),
  crestUrl: coverUrlSchema.nullable().optional(),
  images: z.array(teamImageInputSchema).max(24),
  version: z.number().int().positive(),
});

export const teamMediaIdSchema = routeUuidParam;

export type TeamProfileUpdateInput = z.infer<typeof teamProfileUpdateSchema>;
