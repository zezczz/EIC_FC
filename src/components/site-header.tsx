import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStaffSession } from "@/server/auth/guards";
import { getSessionUser } from "@/server/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { db } from "@/server/db";

export async function SiteHeader() {
  const sessionUser = await getSessionUser();
  const staffSession = sessionUser ? await getStaffSession(sessionUser.id) : null;
  const avatar = sessionUser
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          avatarAsset: { select: { storageKey: true, status: true } },
        },
      })
    : null;
  const avatarUrl =
    avatar?.avatarAsset?.status === "READY" && avatar.avatarAsset.storageKey
      ? `/api/media/${avatar.avatarAsset.storageKey}`
      : null;

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
              {staffSession && (
                <Link
                  href="/captain"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  后台
                </Link>
              )}
              <span className="text-muted-foreground hidden items-center gap-2 text-sm sm:inline-flex">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                ) : null}
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
