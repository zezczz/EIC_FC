import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";

export default async function CaptainHomePage() {
  const [pendingUsers, draftArticles, openRelays] = await Promise.all([
    db.user.count({ where: { status: "PENDING", deletedAt: null } }),
    db.article.count({ where: { status: "DRAFT", deletedAt: null } }),
    db.relay.count({ where: { status: "OPEN", deletedAt: null } }),
  ]);

  const cards = [
    { title: "待审核成员", value: pendingUsers, href: "/captain/users?status=PENDING" },
    { title: "草稿动态", value: draftArticles, href: "/captain/articles" },
    { title: "开放接龙", value: openRelays, href: "/captain/relays" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">队长后台</h1>
        <p className="text-sm text-muted-foreground">管理成员、球队动态与活动接龙</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
