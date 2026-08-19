import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/brand/page-header";
import { listAuditLogs } from "@/server/audit";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export const metadata = { title: "审计日志", robots: { index: false } };

export default async function AuditPage() {
  await requirePermission(PERMISSIONS.AUDIT_READ);
  const { items } = await listAuditLogs({ limit: 100 });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Audit" title="审计日志" description="敏感操作只追加记录，不允许修改。" />
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            暂无审计记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.resourceType}</Badge>
                    <span className="font-medium">{item.action}</span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.actor?.displayName ?? "系统"} · {formatDateTime(item.createdAt)} ·{" "}
                    {item.resourceId}
                  </p>
                </div>
                <code className="text-muted-foreground text-xs">{item.requestId}</code>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
