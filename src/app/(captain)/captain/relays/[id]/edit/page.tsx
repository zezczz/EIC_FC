import { notFound } from "next/navigation";
import { RelayForm } from "@/components/captain/relay-form";
import { PageHeader } from "@/components/brand/page-header";
import { db } from "@/server/db";
import { getCaptainRelay } from "@/server/relays/service";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export const metadata = { title: "编辑接龙", robots: { index: false } };

export default async function EditRelayPage({ params }: PageProps<"/captain/relays/[id]/edit">) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.RELAYS_WRITE);
  if (!(await db.relay.count({ where: { id, deletedAt: null } }))) notFound();
  const relay = await getCaptainRelay(id);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fixtures"
        title="编辑活动接龙"
        description={`当前状态：${relay.status}`}
      />
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
