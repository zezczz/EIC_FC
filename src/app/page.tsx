import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteCrest } from "@/components/brand/site-crest";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * 公开首页：个人兴趣记录。球队动态仅 ACTIVE 队员可见。
 */
export default async function HomePage() {
  const session = await getSessionUser();
  const isActive = session?.status === "ACTIVE";

  return (
    <main className="flex-1">
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_auto]">
          <div className="order-2 lg:order-1">
            <p className="mb-3 text-sm tracking-wide text-white/80">个人业余足球记录</p>
            <h1 className="font-brand text-5xl font-extrabold tracking-wide sm:text-7xl">
              绿茵随记
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
              记录个人业余足球训练与比赛心得，不发布社会新闻，也不提供公开招新。
            </p>
            {isActive ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  render={<Link href="/news" />}
                  size="lg"
                  className="text-primary bg-white hover:bg-white/90"
                >
                  进入球队动态
                </Button>
              </div>
            ) : null}
          </div>
          <div className="order-1 mx-auto lg:order-2">
            <SiteCrest className="h-40 drop-shadow-xl sm:h-52 lg:h-60" decorative />
          </div>
        </div>
      </section>
    </main>
  );
}
