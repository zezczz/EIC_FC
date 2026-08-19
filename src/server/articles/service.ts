import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { ArticleStatus } from "@/generated/prisma/enums";
import type { ArticleCreateInput, ArticleUpdateInput } from "@/schemas/articles";
import { db } from "@/server/db";
import { errConflict, errNotFound, errVersionConflict, AppError } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { createUniqueSlug } from "@/server/articles/slug";
import { extractPlainText } from "@/server/articles/renderer";
import { isExternalHttpsUrl } from "@/lib/external-image";

export type ArticleContext = {
  actorId: string;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

const articleInclude = {
  author: { select: { id: true, displayName: true } },
  coverAsset: { select: { id: true, storageKey: true, mimeType: true } },
} satisfies Prisma.ArticleInclude;

function serializableArticle<T extends { viewCount: bigint }>(article: T) {
  return { ...article, viewCount: article.viewCount.toString() };
}

function json(value: ArticleCreateInput["contentJson"]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function assertReadyCover(assetId: string | null | undefined) {
  if (!assetId) return;
  const asset = await db.mediaAsset.findFirst({
    where: {
      id: assetId,
      status: "READY",
      deletedAt: null,
      purpose: "ARTICLE_COVER",
    },
    select: { id: true },
  });
  if (!asset) throw new AppError("VALIDATION_ERROR", "封面图片不可用");
}

function normalizeCoverInput(input: { coverUrl?: string | null; coverAssetId?: string | null }) {
  if (input.coverUrl) {
    if (!isExternalHttpsUrl(input.coverUrl)) {
      throw new AppError("VALIDATION_ERROR", "封面必须使用 https:// 图床链接");
    }
    return { coverUrl: input.coverUrl.trim(), coverAssetId: null as string | null };
  }
  if (input.coverAssetId) {
    return { coverUrl: null as string | null, coverAssetId: input.coverAssetId };
  }
  if (input.coverUrl === null || input.coverAssetId === null) {
    return { coverUrl: null as string | null, coverAssetId: null as string | null };
  }
  return null;
}

async function getManagedArticle(id: string) {
  const article = await db.article.findUnique({ where: { id }, include: articleInclude });
  if (!article) throw errNotFound("文章不存在");
  return article;
}

async function audit(
  ctx: ArticleContext,
  action: string,
  articleId: string,
  before?: unknown,
  after?: unknown,
) {
  await writeAudit({
    actorId: ctx.actorId,
    action,
    resourceType: "ARTICLE",
    resourceId: articleId,
    before,
    after,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

function invalidate(slug?: string) {
  try {
    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/news/[slug]", "page");
    if (slug) revalidatePath(`/news/${slug}`);
    revalidatePath("/captain/articles");
  } catch {
    // 非 Next.js 请求上下文（测试/脚本）忽略缓存刷新
  }
}

export async function createArticle(input: ArticleCreateInput, ctx: ArticleContext) {
  await assertReadyCover(input.coverAssetId);
  const cover = normalizeCoverInput(input) ?? {
    coverUrl: input.coverUrl ?? null,
    coverAssetId: input.coverAssetId ?? null,
  };
  const slug = await createUniqueSlug(input.title, async (candidate) => {
    return (await db.article.count({ where: { slug: candidate } })) > 0;
  });
  const article = await db.article.create({
    data: {
      slug,
      title: input.title,
      subtitle: input.subtitle || null,
      summary: input.summary,
      contentJson: json(input.contentJson),
      plainText: extractPlainText(input.contentJson),
      coverUrl: cover.coverUrl,
      coverAssetId: cover.coverAssetId,
      authorId: ctx.actorId,
    },
    include: articleInclude,
  });
  await audit(ctx, "ARTICLE_CREATE", article.id, undefined, {
    title: article.title,
    status: article.status,
  });
  invalidate(article.slug);
  return serializableArticle(article);
}

export async function updateArticle(id: string, input: ArticleUpdateInput, ctx: ArticleContext) {
  const before = await getManagedArticle(id);
  if (before.deletedAt) throw errConflict("已删除文章不可编辑，请先恢复");
  await assertReadyCover(input.coverAssetId);
  const cover = normalizeCoverInput(input);

  const result = await db.article.updateMany({
    where: { id, version: input.version, deletedAt: null },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle || null } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.contentJson !== undefined
        ? {
            contentJson: json(input.contentJson),
            plainText: extractPlainText(input.contentJson),
          }
        : {}),
      ...(cover
        ? { coverUrl: cover.coverUrl, coverAssetId: cover.coverAssetId }
        : input.coverUrl !== undefined || input.coverAssetId !== undefined
          ? {
              coverUrl: input.coverUrl ?? null,
              coverAssetId: input.coverAssetId ?? null,
            }
          : {}),
      version: { increment: 1 },
    },
  });
  if (result.count === 0) throw errVersionConflict("文章已被其他人修改，请刷新后重试");
  const article = await getManagedArticle(id);
  await audit(ctx, "ARTICLE_UPDATE", id, { version: before.version }, { version: article.version });
  invalidate(article.slug);
  return serializableArticle(article);
}

async function transition(
  id: string,
  allowed: ArticleStatus[],
  status: ArticleStatus,
  ctx: ArticleContext,
  action: string,
) {
  const before = await getManagedArticle(id);
  if (before.deletedAt) throw errConflict("已删除文章不可变更状态");
  if (!allowed.includes(before.status))
    throw new AppError("INVALID_STATE", "当前文章状态不允许此操作");
  const now = new Date();
  const article = await db.article.update({
    where: { id },
    data: {
      status,
      version: { increment: 1 },
      ...(status === "PUBLISHED"
        ? { publishedAt: before.publishedAt ?? now, publishedById: ctx.actorId }
        : {}),
      ...(status === "DRAFT" ? { pinnedAt: null, pinOrder: null } : {}),
    },
    include: articleInclude,
  });
  await audit(ctx, action, id, { status: before.status }, { status });
  invalidate(article.slug);
  return serializableArticle(article);
}

export const publishArticle = (id: string, ctx: ArticleContext) =>
  transition(id, ["DRAFT", "ARCHIVED"], "PUBLISHED", ctx, "ARTICLE_PUBLISH");
export const unpublishArticle = (id: string, ctx: ArticleContext) =>
  transition(id, ["PUBLISHED"], "DRAFT", ctx, "ARTICLE_UNPUBLISH");
export const archiveArticle = (id: string, ctx: ArticleContext) =>
  transition(id, ["PUBLISHED"], "ARCHIVED", ctx, "ARTICLE_ARCHIVE");

export async function pinArticle(id: string, pinOrder: number, ctx: ArticleContext) {
  const before = await getManagedArticle(id);
  if (before.deletedAt || before.status !== "PUBLISHED") {
    throw new AppError("INVALID_STATE", "只有已发布文章可以置顶");
  }
  const article = await db.article.update({
    where: { id },
    data: { pinnedAt: new Date(), pinOrder, version: { increment: 1 } },
    include: articleInclude,
  });
  await audit(ctx, "ARTICLE_PIN", id, { pinnedAt: before.pinnedAt }, { pinOrder });
  invalidate(article.slug);
  return serializableArticle(article);
}

export async function unpinArticle(id: string, ctx: ArticleContext) {
  const before = await getManagedArticle(id);
  const article = await db.article.update({
    where: { id },
    data: { pinnedAt: null, pinOrder: null, version: { increment: 1 } },
    include: articleInclude,
  });
  await audit(ctx, "ARTICLE_UNPIN", id, { pinnedAt: before.pinnedAt }, { pinnedAt: null });
  invalidate(article.slug);
  return serializableArticle(article);
}

export async function deleteArticle(id: string, ctx: ArticleContext) {
  const before = await getManagedArticle(id);
  if (before.deletedAt) throw errConflict("文章已被删除");
  const article = await db.article.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: ctx.actorId,
      pinnedAt: null,
      pinOrder: null,
      version: { increment: 1 },
    },
    include: articleInclude,
  });
  await audit(ctx, "ARTICLE_DELETE", id, { deletedAt: null }, { deletedAt: article.deletedAt });
  invalidate(article.slug);
  return serializableArticle(article);
}

export async function restoreArticle(id: string, ctx: ArticleContext) {
  const before = await getManagedArticle(id);
  if (!before.deletedAt) throw errConflict("文章未被删除");
  const retention = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (before.deletedAt.getTime() < retention) throw errConflict("文章已超过 30 天恢复期限");
  const article = await db.article.update({
    where: { id },
    data: {
      deletedAt: null,
      deletedById: null,
      version: { increment: 1 },
    },
    include: articleInclude,
  });
  await audit(ctx, "ARTICLE_RESTORE", id, { deletedAt: before.deletedAt }, { deletedAt: null });
  invalidate(article.slug);
  return serializableArticle(article);
}

export async function listPublicArticles(input: { cursor?: string; limit: number }) {
  const rows = await db.article.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ pinnedAt: "desc" }, { pinOrder: "asc" }, { publishedAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      summary: true,
      publishedAt: true,
      pinnedAt: true,
      coverUrl: true,
      coverAsset: { select: { storageKey: true, mimeType: true } },
      author: { select: { displayName: true } },
    },
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export async function getPublicArticle(slug: string) {
  const article = await db.article.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      summary: true,
      contentJson: true,
      publishedAt: true,
      updatedAt: true,
      pinnedAt: true,
      viewCount: true,
      coverUrl: true,
      author: { select: { displayName: true } },
      coverAsset: {
        select: { id: true, storageKey: true, mimeType: true, width: true, height: true },
      },
    },
  });
  if (!article) throw errNotFound("文章不存在或尚未发布");
  void db.article
    .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);
  return serializableArticle(article);
}

export async function listCaptainArticles(input: {
  cursor?: string;
  limit: number;
  status?: ArticleStatus;
  deleted: boolean;
}) {
  const rows = await db.article.findMany({
    where: {
      deletedAt: input.deleted ? { not: null } : null,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    include: articleInclude,
  });
  const hasMore = rows.length > input.limit;
  const items = (hasMore ? rows.slice(0, input.limit) : rows).map((item) => ({
    ...item,
    viewCount: item.viewCount.toString(),
  }));
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export async function getCaptainArticle(id: string) {
  const article = await getManagedArticle(id);
  return serializableArticle(article);
}
