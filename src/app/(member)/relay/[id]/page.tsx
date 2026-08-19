import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { RelayEntryForm } from "@/components/relay/relay-entry-form";
import { formatDateTime } from "@/lib/format";
import { RELAY_RESPONSE_LABELS } from "@/lib/relay-labels";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getMemberRelay } from "@/server/relays/service";

export const metadata = { title: "接龙详情", robots: { index: false } };

export default async function RelayDetailPage({ params }: PageProps<"/relay/[id]">) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  if (!(await db.relay.count({ where: { id, deletedAt: null, status: { not: "DRAFT" } } }))) {
    notFound();
  }
  const relay = await getMemberRelay(id, user.id);
  const disabled = relay.status !== "OPEN" || relay.signupDeadline <= new Date();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex gap-2">
            <Badge>{relay.status}</Badge>
            {relay.capacityInfo.overCapacity && <Badge variant="destructive">当前超额</Badge>}
          </div>
          <p className="font-brand text-primary mb-3 text-[0.7rem] tracking-[0.28em] uppercase">
            Matchday
          </p>
          <h1 className="text-3xl font-black">{relay.title}</h1>
          <p className="text-muted-foreground mt-4 whitespace-pre-wrap">{relay.description}</p>
        </div>
        <dl className="border-sideline bg-card grid gap-3 rounded-xl border p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">活动时间</dt>
            <dd>{formatDateTime(relay.eventAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">地点</dt>
            <dd>{relay.location}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">报名截止</dt>
            <dd>{formatDateTime(relay.signupDeadline)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">容量</dt>
            <dd>
              正式 {relay.capacityInfo.joined}
              {relay.capacity ? ` / ${relay.capacity}` : ""}，候补 {relay.capacityInfo.waitlisted}
            </dd>
          </div>
        </dl>
        <section>
          <h2 className="mb-3 text-xl font-bold">接龙名单</h2>
          <div className="space-y-2">
            {relay.entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有人接龙</p>
            ) : (
              relay.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                >
                  <div>
                    <span>
                      {entry.user.displayName} · {entry.participantCount} 人
                    </span>
                    {entry.companionNames.length > 0 && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        同行：{entry.companionNames.join("、")}
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-muted-foreground mt-1 text-xs">备注：{entry.note}</p>
                    )}
                  </div>
                  <Badge variant="outline">{RELAY_RESPONSE_LABELS[entry.response]}</Badge>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <RelayEntryForm relayId={relay.id} disabled={disabled} initial={relay.myEntry} />
    </div>
  );
}
