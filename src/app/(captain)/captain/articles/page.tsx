import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleActions } from "@/components/captain/article-actions";
import { formatDateTime } from "@/lib/format";
import { listCaptainArticles } from "@/server/articles/service";

export const metadata = { title: "文章管理", robots: { index: false } };

export default async function CaptainArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const query = await searchParams;
  const deleted = query.deleted === "true";
  const { items } = await listCaptainArticles({ limit: 50, deleted });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">球队动态</h1>
          <p className="text-muted-foreground text-sm">管理草稿、发布状态和置顶顺序</p>
        </div>
        <Button render={<Link href="/captain/articles/new" />}>新建文章</Button>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={deleted ? "outline" : "default"}
          render={<Link href="/captain/articles" />}
        >
          正常文章
        </Button>
        <Button
          size="sm"
          variant={deleted ? "default" : "outline"}
          render={<Link href="/captain/articles?deleted=true" />}
        >
          回收站
        </Button>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">暂无文章</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{article.title}</CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                      更新于 {formatDateTime(article.updatedAt)} · 版本 {article.version}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{article.status}</Badge>
                    {article.pinnedAt && <Badge>置顶</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {!deleted && (
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/captain/articles/${article.id}/edit`} />}
                  >
                    编辑
                  </Button>
                )}
                <ArticleActions
                  id={article.id}
                  status={article.status}
                  pinned={Boolean(article.pinnedAt)}
                  deleted={Boolean(article.deletedAt)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
