import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ArticleContent } from "@/components/article/article-content";
import { formatDateTime } from "@/lib/format";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { getPublicArticle } from "@/server/articles/service";

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.article.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: { title: true, summary: true, coverUrl: true, coverAsset: { select: { storageKey: true } } },
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
    alternates: { canonical: `${env.APP_URL}/news/${slug}` },
    openGraph: {
      title: article.title,
      description: article.summary,
      type: "article",
      images: image ? [image] : undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const exists = await db.article.count({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });
  if (!exists) notFound();
  const article = await getPublicArticle(slug);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <article>
          <header className="mb-8 border-b pb-8">
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
      </main>
    </>
  );
}
