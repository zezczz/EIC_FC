import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/server/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";

/**
 * 顶部导航（手机优先）。
 */
export async function SiteHeader() {
  const sessionUser = await getSessionUser();
  const isCaptain = sessionUser?.role === "CAPTAIN" && sessionUser.status === "ACTIVE";

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          EIC&nbsp;FC
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/news" className="text-muted-foreground hover:text-foreground text-sm">
            球队动态
          </Link>
          {sessionUser ? (
            <>
              {sessionUser.status === "ACTIVE" && (
                <>
                  <Link
                    href="/relay"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    活动接龙
                  </Link>
                  <Link
                    href="/account"
                    className="text-muted-foreground hover:text-foreground hidden text-sm sm:inline"
                  >
                    我的资料
                  </Link>
                </>
              )}
              {isCaptain && (
                <Link
                  href="/captain"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  后台
                </Link>
              )}
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {sessionUser.displayName}
              </span>
              <SignOutButton variant="ghost" size="sm" />
            </>
          ) : (
            <>
              <Button render={<Link href="/login" />} variant="ghost" size="sm">
                登录
              </Button>
              <Button render={<Link href="/register" />} size="sm">
                注册
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
