import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/server/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";

/**
 * 审核状态页：不在 ACTIVE 专属 (member) 路由组内，避免重定向环。
 */
export default async function PendingPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login");
  }
  if (sessionUser.status === "ACTIVE") {
    redirect("/");
  }

  const statusText: Record<string, string> = {
    PENDING: "等待队长审核",
    REJECTED: "申请未通过",
  };

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>账号状态</CardTitle>
            <CardDescription>
              {sessionUser.status === "PENDING" &&
                "注册申请已提交，请耐心等待队长审核。审核通过后即可参加活动接龙。"}
              {sessionUser.status === "REJECTED" &&
                "很遗憾，您的注册申请未通过。如有疑问请联系队长。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>{statusText[sessionUser.status] ?? sessionUser.status}</Badge>
              <span className="text-sm text-muted-foreground">
                {sessionUser.displayName}
              </span>
            </div>
            {sessionUser.status === "REJECTED" && sessionUser.reviewReason && (
              <p className="rounded-md bg-muted p-3 text-sm">
                拒绝原因：{sessionUser.reviewReason}
              </p>
            )}
            {sessionUser.status === "PENDING" && (
              <p className="text-sm text-muted-foreground">
                审核结果会显示在此页面，也可以重新登录查看最新状态。
              </p>
            )}
            <SignOutButton />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
