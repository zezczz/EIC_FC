import { RelayForm } from "@/components/captain/relay-form";
import { PageHeader } from "@/components/brand/page-header";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export const metadata = { title: "新建接龙", robots: { index: false } };

export default async function NewRelayPage() {
  await requirePermission(PERMISSIONS.RELAYS_WRITE);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fixtures" title="新建活动接龙" description="保存后在列表中开放报名。" />
      <RelayForm />
    </div>
  );
}
