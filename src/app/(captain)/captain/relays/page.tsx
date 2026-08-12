import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelayActions } from "@/components/captain/relay-actions";
import { formatDateTime } from "@/lib/format";
import { listCaptainRelays } from "@/server/relays/service";

export const metadata = { title: "接龙管理", robots: { index: false } };

export default async function CaptainRelaysPage() {
  const { items } = await listCaptainRelays({ limit: 50 });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">活动接龙</h1>
          <p className="text-muted-foreground text-sm">创建活动并管理开放、截止与完成状态</p>
        </div>
        <Button render={<Link href="/captain/relays/new" />}>新建接龙</Button>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">暂无接龙</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((relay) => (
            <Card key={relay.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{relay.title}</CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDateTime(relay.eventAt)} · {relay.location} · {relay._count.entries}{" "}
                      条记录
                    </p>
                  </div>
                  <Badge variant="secondary">{relay.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {!["CANCELLED", "FINISHED"].includes(relay.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/captain/relays/${relay.id}/edit`} />}
                  >
                    编辑
                  </Button>
                )}
                <RelayActions id={relay.id} status={relay.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
