import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleContent } from "@/components/article/article-content";
import { formatDateTime } from "@/lib/format";
import { ARTICLE_STATUS_LABELS } from "@/lib/article-labels";
import { db } from "@/server/db";
import { getCaptainArticle } from "@/server/articles/service";
import { requireAnyPermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export const metadata = { title: "预览文章", robots: { index: false } };

export default async function PreviewArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAnyPermission(
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_WRITE,
    PERMISSIONS.ARTICLES_PUBLISH,
  );
  if (!(await db.article.count({ where: { id } }))) notFound();
  const article = await getCaptainArticle(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{ARTICLE_STATUS_LABELS[article.status]}</Badge>
            {article.status === "DRAFT" && (
              <Badge variant="outline">草稿预览，仅队员登录后可见</Badge>
            )}
          </div>
          <p className="font-brand text-primary text-[0.7rem] tracking-[0.28em] uppercase">
            Preview
          </p>
          <h1 className="mt-1 text-2xl font-bold">预览球队动态</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            队员可见地址：/news/{article.slug}
            {article.status !== "PUBLISHED" ? "（尚未发布）" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/captain/articles/${article.id}/edit`} />}
          >
            返回编辑
          </Button>
          {article.status === "PUBLISHED" && (
            <Button size="sm" render={<Link href={`/news/${article.slug}`} target="_blank" />}>
              查看队员页
            </Button>
          )}
        </div>
      </div>

      <article className="border-sideline bg-card rounded-xl border p-6">
        <header className="border-sideline mb-8 border-b pb-8">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{article.title}</h2>
          {article.subtitle && (
            <p className="text-muted-foreground mt-3 text-lg">{article.subtitle}</p>
          )}
          <p className="text-muted-foreground mt-4 text-sm">
            {article.author.displayName}
            {article.publishedAt ? ` · ${formatDateTime(article.publishedAt)}` : " · 尚未发布"}
          </p>
        </header>
        <ArticleContent content={article.contentJson} />
      </article>
    </div>
  );
}
