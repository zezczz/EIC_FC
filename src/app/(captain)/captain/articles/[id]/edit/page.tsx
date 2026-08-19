import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleEditor } from "@/components/article/article-editor";
import { ArticleActions } from "@/components/captain/article-actions";
import { ARTICLE_STATUS_LABELS } from "@/lib/article-labels";
import { db } from "@/server/db";
import { getCaptainArticle } from "@/server/articles/service";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export const metadata = { title: "编辑文章", robots: { index: false } };

export default async function EditArticlePage({
  params,
}: PageProps<"/captain/articles/[id]/edit">) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  const exists = await db.article.count({ where: { id } });
  if (!exists) notFound();
  const article = await getCaptainArticle(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{ARTICLE_STATUS_LABELS[article.status]}</Badge>
            {article.status === "DRAFT" && <Badge variant="outline">草稿尚未公开</Badge>}
          </div>
          <p className="font-brand text-primary text-[0.7rem] tracking-[0.28em] uppercase">
            Newsroom
          </p>
          <h1 className="mt-1 text-2xl font-bold">编辑球队动态</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {article.status === "PUBLISHED" ? (
              <>
                公开地址：
                <Link href={`/news/${article.slug}`} className="text-primary hover:underline">
                  /news/{article.slug}
                </Link>
              </>
            ) : (
              <>发布后公开地址：/news/{article.slug}</>
            )}
            {" · "}
            当前版本 {article.version}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/captain/articles/${article.id}/preview`} />}
          >
            预览
          </Button>
          <ArticleActions
            id={article.id}
            status={article.status}
            pinned={Boolean(article.pinnedAt)}
            deleted={Boolean(article.deletedAt)}
          />
        </div>
      </div>
      <ArticleEditor
        initial={{
          id: article.id,
          title: article.title,
          subtitle: article.subtitle,
          summary: article.summary,
          contentJson: article.contentJson,
          coverUrl: article.coverUrl,
          coverAssetId: article.coverAssetId,
          version: article.version,
          status: article.status,
        }}
      />
    </div>
  );
}
