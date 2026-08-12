import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/server/db";
import { ArticleCard } from "@/components/article/article-card";

/**
 * 首页（ARCHITECTURE.md §13）：球队视觉区、置顶动态和最新动态。
 */
export default async function HomePage() {
  const [pinned, latest] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED", deletedAt: null, pinnedAt: { not: null } },
      orderBy: [{ pinOrder: "asc" }, { publishedAt: "desc" }],
      take: 3,
      include: {
        coverAsset: { select: { storageKey: true, mimeType: true } },
      },
    }),
    db.article.findMany({
      where: { status: "PUBLISHED", deletedAt: null, pinnedAt: null },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: {
        coverAsset: { select: { storageKey: true, mimeType: true } },
      },
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* 球队视觉区 */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 to-emerald-950 text-white">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
            <p className="mb-3 text-sm font-medium text-emerald-300">业余足球队 · 快乐足球</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">EIC FC</h1>
            <p className="mt-4 max-w-xl text-base text-emerald-100/90 sm:text-lg">
              与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button render={<Link href="/news" />} size="lg" className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400">
                浏览球队动态
              </Button>
              <Button
                render={<Link href="/register" />}
                size="lg"
                variant="outline"
                className="border-emerald-400/40 text-white hover:bg-emerald-900 hover:text-white"
              >
                申请加入
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10">
          {/* 置顶动态 */}
          {pinned.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold">置顶动态</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {pinned.map((article, i) => (
                  <ArticleCard key={article.id} article={article} rank={i + 1} />
                ))}
              </div>
            </section>
          )}

          {/* 最新动态 */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">最新动态</h2>
              <Button render={<Link href="/news" />} variant="ghost" size="sm">
                查看全部 →
              </Button>
            </div>
            {latest.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {latest.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  还没有发布球队动态，敬请期待。
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>

      {/* 备案信息位置（ARCHITECTURE.md §14） */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} EIC FC</p>
          <p className="mt-1">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:underline">
              备案号：ICP备案号待填写
            </a>
          </p>
          <p className="mt-1">公安联网备案号待填写</p>
        </div>
      </footer>
    </>
  );
}
