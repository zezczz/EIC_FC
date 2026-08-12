import { z } from "zod";
import { routeParamString, routeUuidParam } from "@/schemas/common";

const tiptapMarkSchema = z
  .object({
    type: z.enum(["bold", "italic", "strike", "link"]),
    attrs: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<z.infer<typeof tiptapMarkSchema>>;
  text?: string;
};

const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        "doc",
        "text",
        "paragraph",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "horizontalRule",
        "hardBreak",
        "image",
        "caption",
        "codeBlock",
      ]),
      attrs: z.record(z.string(), z.unknown()).optional(),
      content: z.array(tiptapNodeSchema).max(5000).optional(),
      marks: z.array(tiptapMarkSchema).max(8).optional(),
      text: z.string().max(100_000).optional(),
    })
    .strict(),
);

export const articleContentSchema = tiptapNodeSchema.superRefine((node, ctx) => {
  if (node.type !== "doc") {
    ctx.addIssue({ code: "custom", message: "正文根节点必须为 doc" });
  }
});

export const articleIdSchema = routeUuidParam;
export const slugSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().trim().min(1).max(180),
);
export const articleCreateSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(120),
  subtitle: z.string().trim().max(180).nullable().optional(),
  summary: z.string().trim().min(1, "摘要不能为空").max(300),
  contentJson: articleContentSchema,
  coverAssetId: z.string().uuid().nullable().optional(),
});

export const articleUpdateSchema = articleCreateSchema.partial().extend({
  version: z.number().int().positive(),
});

export const articleListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  deleted: z.coerce.boolean().default(false),
});

export const pinArticleSchema = z.object({
  pinOrder: z.number().int().min(0).max(999).default(0),
});

export type ArticleContent = z.infer<typeof articleContentSchema>;
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
