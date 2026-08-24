import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/components/account/account-form";
import { PageHeader } from "@/components/brand/page-header";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import { FIELD_POSITION_LABELS, PREFERRED_FOOT_LABELS } from "@/lib/field-positions";
import { STAFF_TITLE_LABELS } from "@/server/auth/permissions";

export const metadata = { title: "我的资料", robots: { index: false } };

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
      displayName: true,
      role: true,
      staffTitle: true,
      teamTitle: true,
      signature: true,
      studentId: true,
      fieldPositions: true,
      preferredFoot: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      avatarAssetId: true,
      avatarAsset: { select: { storageKey: true, status: true } },
    },
  });
  if (!user) return null;
  const avatarUrl =
    user.avatarAsset?.status === "READY" && user.avatarAsset.storageKey
      ? `/api/media/${user.avatarAsset.storageKey}`
      : null;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageHeader className="mb-6" eyebrow="Profile" title="我的资料" />
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {user.displayName}
            <Badge>{user.status}</Badge>
            <Badge variant="outline">{user.role}</Badge>
            {user.teamTitle && <Badge variant="secondary">{user.teamTitle}</Badge>}
            {user.staffTitle && (
              <Badge variant="secondary">{STAFF_TITLE_LABELS[user.staffTitle]}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">用户名</dt>
              <dd>@{user.username}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">加入时间</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">最近登录</dt>
              <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "暂无记录"}</dd>
            </div>
            {user.fieldPositions.length > 0 ? (
              <div>
                <dt className="text-muted-foreground">场上位置</dt>
                <dd>
                  {user.fieldPositions
                    .map(
                      (code) =>
                        FIELD_POSITION_LABELS[code as keyof typeof FIELD_POSITION_LABELS] ?? code,
                    )
                    .join("、")}
                </dd>
              </div>
            ) : null}
            {user.preferredFoot ? (
              <div>
                <dt className="text-muted-foreground">惯用脚</dt>
                <dd>{PREFERRED_FOOT_LABELS[user.preferredFoot]}</dd>
              </div>
            ) : null}
          </dl>
          <AccountForm
            initial={{
              displayName: user.displayName,
              avatarAssetId: user.avatarAssetId,
              avatarUrl,
              status: user.status,
              signature: user.signature,
              studentId: user.studentId,
              fieldPositions: user.fieldPositions,
              preferredFoot: user.preferredFoot,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
