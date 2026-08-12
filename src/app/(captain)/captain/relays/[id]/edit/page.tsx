import { notFound } from "next/navigation";
import { RelayForm } from "@/components/captain/relay-form";
import { db } from "@/server/db";
import { getCaptainRelay } from "@/server/relays/service";

export const metadata = { title: "编辑接龙", robots: { index: false } };

export default async function EditRelayPage({ params }: PageProps<"/captain/relays/[id]/edit">) {
  const { id } = await params;
  if (!(await db.relay.count({ where: { id, deletedAt: null } }))) notFound();
  const relay = await getCaptainRelay(id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">编辑活动接龙</h1>
        <p className="text-muted-foreground text-sm">当前状态：{relay.status}</p>
      </div>
      <RelayForm
        initial={{
          id: relay.id,
          title: relay.title,
          description: relay.description,
          eventAt: relay.eventAt.toISOString(),
          eventEndsAt: relay.eventEndsAt?.toISOString() ?? null,
          location: relay.location,
          signupDeadline: relay.signupDeadline.toISOString(),
          capacity: relay.capacity,
          waitlistEnabled: relay.waitlistEnabled,
          version: relay.version,
        }}
      />
    </div>
  );
}
