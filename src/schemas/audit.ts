import { z } from "zod";

export const auditListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  resourceType: z.string().trim().max(50).optional(),
  action: z.string().trim().max(80).optional(),
});
