import { z } from "zod";
import { routeUuidParam } from "@/schemas/common";

export const mediaIdSchema = routeUuidParam;

export const mediaPresignSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive(),
  purpose: z.enum(["ARTICLE_COVER", "ARTICLE_CONTENT", "AVATAR"]),
});

export const mediaCompleteSchema = z.object({
  id: mediaIdSchema,
});
