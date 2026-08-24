import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/components/account/account-form";
import { PageHeader } from "@/components/brand/page-header";
import { requireActiveMember } from "@/server/auth/guards";
import { getMemberProfile } from "@/server/users/profile";
import { FIELD_POSITION_LABELS, PREFERRED_FOOT_LABELS } from "@/lib/field-positions";
import { STAFF_TITLE_LABELS } from "@/server/auth/permissions";

export const metadata = { title: "队员资料", robots: { index: false } };

export default async function MemberDetailPage({ params }: PageProps<"/members/[id]">) {
  const session = await requireActiveMember();
  const { id } = await params;
  let member;
  try {
    member = await getMemberProfile(id, session.id);
  } catch {
    notFound();
  }

  const canEditAny = Object.values(member.canEdit).some(Boolean);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageHeader className="mb-6" eyebrow="Squad" title={member.displayName} />
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {member.displayName}
            {member.teamTitle ? <Badge variant="secondary">{member.teamTitle}</Badge> : null}
            <Badge variant="outline">{member.role}</Badge>
            {member.staffTitle ? <Badge>{STAFF_TITLE_LABELS[member.staffTitle]}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-muted size-16 overflow-hidden rounded-full">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-lg font-bold">
                  {member.displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">@{member.username}</p>
              {member.signature ? <p className="mt-1">{member.signature}</p> : null}
            </div>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {member.studentId !== undefined ? (
              <div>
                <dt className="text-muted-foreground">学号</dt>
                <dd>{member.studentId || "未填写"}</dd>
              </div>
            ) : null}
            {member.fieldPositions !== undefined ? (
              <div>
                <dt className="text-muted-foreground">场上位置</dt>
                <dd>
                  {member.fieldPositions.length
                    ? member.fieldPositions
                        .map(
                          (code) =>
                            FIELD_POSITION_LABELS[code as keyof typeof FIELD_POSITION_LABELS] ??
                            code,
                        )
                        .join("、")
                    : "未填写"}
                </dd>
              </div>
            ) : null}
            {member.preferredFoot !== undefined ? (
              <div>
                <dt className="text-muted-foreground">惯用脚</dt>
                <dd>
                  {member.preferredFoot ? PREFERRED_FOOT_LABELS[member.preferredFoot] : "未填写"}
                </dd>
              </div>
            ) : null}
          </dl>
          {canEditAny ? (
            <AccountForm
              initial={{
                displayName: member.displayName,
                avatarAssetId: member.avatarAssetId,
                avatarUrl: member.avatarUrl,
                status: member.status,
                signature: member.signature,
                studentId: member.studentId,
                fieldPositions: member.fieldPositions,
                preferredFoot: member.preferredFoot,
              }}
              editable={member.canEdit}
              savePath={`/api/members/${member.id}`}
              showPassword={false}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
