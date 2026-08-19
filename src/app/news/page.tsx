import type { Metadata } from "next";
import { ArticleCard } from "@/components/article/article-card";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listPublicArticles } from "@/server/articles/service";

export const metadata: Metadata = {
  title: "球队动态",
  description: "查看 EIC FC 最新球队公告、比赛记录与活动动态。",
};

export default async function NewsPage() {
  const { items } = await listPublicArticles({ limit: 30 });
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <PageHeader
        className="mb-8"
        eyebrow="Club News"
        title="球队动态"
        description="记录比赛、训练与球队活动。"
      />
      {items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center">
            还没有已发布的球队动态，敬请期待。
          </CardContent>
        </Card>
      )}
    </main>
  );
}
