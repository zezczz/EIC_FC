import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/brand/page-header";
import { requireActiveMember } from "@/server/auth/guards";
import { listMembers } from "@/server/users/profile";
import { FIELD_POSITION_LABELS } from "@/lib/field-positions";

export const metadata = { title: "队员名册", robots: { index: false } };

export default async function MembersPage() {
  const session = await requireActiveMember();
  const members = await listMembers(session.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <PageHeader
        className="mb-6"
        eyebrow="Squad"
        title="队员名册"
        description="查看队友公开资料"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Link key={member.id} href={`/members/${member.id}`} className="block">
            <Card className="h-full hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="bg-muted size-12 overflow-hidden rounded-full">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center font-bold">
                      {member.displayName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{member.displayName}</CardTitle>
                  <p className="text-muted-foreground truncate text-sm">@{member.username}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {member.teamTitle ? <Badge variant="secondary">{member.teamTitle}</Badge> : null}
                  <Badge variant="outline">{member.role}</Badge>
                </div>
                {member.signature ? (
                  <p className="text-muted-foreground line-clamp-2">{member.signature}</p>
                ) : null}
                {member.fieldPositions?.length ? (
                  <p>
                    {member.fieldPositions
                      .map(
                        (code) =>
                          FIELD_POSITION_LABELS[code as keyof typeof FIELD_POSITION_LABELS] ?? code,
                      )
                      .join(" / ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
