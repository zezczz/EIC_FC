import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/article/article-editor";
import { db } from "@/server/db";
import { getCaptainArticle } from "@/server/articles/service";

export const metadata = { title: "编辑文章", robots: { index: false } };

export default async function EditArticlePage({
  params,
}: PageProps<"/captain/articles/[id]/edit">) {
  const { id } = await params;
  const exists = await db.article.count({ where: { id } });
  if (!exists) notFound();
  const article = await getCaptainArticle(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">编辑球队动态</h1>
        <p className="text-muted-foreground text-sm">
          地址：/news/{article.slug} · 当前版本 {article.version}
        </p>
      </div>
      <ArticleEditor
        initial={{
          id: article.id,
          title: article.title,
          subtitle: article.subtitle,
          summary: article.summary,
          contentJson: article.contentJson,
          coverAssetId: article.coverAssetId,
          version: article.version,
        }}
      />
    </div>
  );
}
