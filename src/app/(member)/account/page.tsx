import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "我的资料", robots: { index: false } };

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
      displayName: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) return null;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black">我的资料</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {user.displayName}
            <Badge>{user.status}</Badge>
            <Badge variant="outline">{user.role}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">用户名</dt>
              <dd>@{user.username}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">邮箱</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">加入时间</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">最近登录</dt>
              <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "暂无记录"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
