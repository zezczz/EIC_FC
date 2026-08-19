import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/page-header";
import { formatDateTime } from "@/lib/format";
import { getSessionUser } from "@/server/auth/session";
import { listMemberRelays } from "@/server/relays/service";

export const metadata = { title: "活动接龙", robots: { index: false } };

export default async function RelayPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const { items } = await listMemberRelays({ limit: 50, userId: user.id });
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <PageHeader
        className="mb-8"
        eyebrow="Sign Up"
        title="活动接龙"
        description="报名参加球队训练、比赛与聚会。"
      />
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            暂无活动接龙
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((relay) => (
            <Link key={relay.id} href={`/relay/${relay.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle>{relay.title}</CardTitle>
                    <Badge variant="secondary">{relay.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-1 text-sm">
                  <p>
                    {formatDateTime(relay.eventAt)} · {relay.location}
                  </p>
                  <p>
                    {relay.capacity ? `限 ${relay.capacity} 人` : "不限人数"} · 已有{" "}
                    {relay._count.entries} 条接龙
                  </p>
                  {relay.entries[0] && <p>我的状态：{relay.entries[0].response}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
