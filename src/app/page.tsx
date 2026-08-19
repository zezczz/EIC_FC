import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import { ArticleCard } from "@/components/article/article-card";
import { SiteCrest } from "@/components/brand/site-crest";
import { getTeamProfile } from "@/server/team/service";

/**
 * 首页（ARCHITECTURE.md §13）：球队视觉区、置顶动态和最新动态。
 */
export default async function HomePage() {
  const [pinned, latest, team] = await Promise.all([
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
    getTeamProfile(),
  ]);

  return (
    <main className="flex-1">
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_auto]">
          <div className="order-2 lg:order-1">
            <p className="mb-3 text-sm tracking-wide text-white/80">
              {team.subtitle || "华科电信足球队"}
            </p>
            <h1 className="font-brand text-5xl font-extrabold tracking-wide sm:text-7xl">
              {team.name}
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
              {team.summary || "与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。"}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                render={<Link href="/news" />}
                size="lg"
                className="text-primary bg-white hover:bg-white/90"
              >
                浏览球队动态
              </Button>
              <Button
                render={<Link href="/register" />}
                size="lg"
                variant="outline"
                className="border-white/55 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:border-white focus-visible:ring-white/40"
              >
                申请加入
              </Button>
            </div>
          </div>
          <div className="order-1 mx-auto lg:order-2">
            {team.crestUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.crestUrl}
                alt={`${team.name} 队徽`}
                className="h-40 drop-shadow-xl sm:h-52 lg:h-60"
              />
            ) : (
              <SiteCrest className="h-40 drop-shadow-xl sm:h-52 lg:h-60" decorative />
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {pinned.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="font-brand text-primary text-[0.7rem] tracking-[0.28em] uppercase">
                  Pinned
                </p>
                <h2 className="text-xl font-bold">置顶动态</h2>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {pinned.map((article, i) => (
                <ArticleCard key={article.id} article={article} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-brand text-primary text-[0.7rem] tracking-[0.28em] uppercase">
                Latest
              </p>
              <h2 className="text-xl font-bold">最新动态</h2>
            </div>
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
              <CardContent className="text-muted-foreground py-12 text-center">
                还没有发布球队动态，敬请期待。
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
