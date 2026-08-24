import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/article/article-content";
import { formatDateTime } from "@/lib/format";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { getPublicArticle } from "@/server/articles/service";
import { normalizeArticleSlug } from "@/server/articles/slug";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const privateNewsMeta: Metadata = {
  title: "球队动态",
  robots: { index: false },
};

async function loadPublicArticle(rawSlug: string) {
  const slug = normalizeArticleSlug(rawSlug);
  try {
    return await getPublicArticle(slug);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      logger.warn(
        { event: "news_detail_not_found", rawSlug, normalizedSlug: slug },
        "news detail slug lookup failed",
      );
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const session = await getSessionUser();
  if (!session || session.status !== "ACTIVE") {
    return privateNewsMeta;
  }

  const { slug: rawSlug } = await params;
  const slug = normalizeArticleSlug(rawSlug);
  const article = await db.article.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      title: true,
      summary: true,
      coverUrl: true,
      coverAsset: { select: { storageKey: true } },
    },
  });
  if (!article) return { title: "动态未找到", robots: { index: false } };
  const image = article.coverUrl
    ? article.coverUrl
    : article.coverAsset
      ? `${env.APP_URL}/api/media/${article.coverAsset.storageKey}`
      : undefined;
  return {
    title: article.title,
    description: article.summary,
    robots: { index: false },
    openGraph: {
      title: article.title,
      description: article.summary,
      type: "article",
      images: image ? [image] : undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps<"/news/[slug]">) {
  const { slug: rawSlug } = await params;
  const article = await loadPublicArticle(rawSlug);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <article>
        <header className="border-sideline mb-8 border-b pb-8">
          <p className="font-brand text-primary mb-3 text-[0.7rem] tracking-[0.28em] uppercase">
            Club News
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{article.title}</h1>
          {article.subtitle && (
            <p className="text-muted-foreground mt-3 text-lg">{article.subtitle}</p>
          )}
          <p className="text-muted-foreground mt-4 text-sm">
            {article.author.displayName}
            {article.publishedAt ? ` · ${formatDateTime(article.publishedAt)}` : ""}
          </p>
        </header>
        <ArticleContent content={article.contentJson} />
      </article>
    </div>
  );
}
