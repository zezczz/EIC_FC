import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArticleContent } from "@/components/article/article-content";
import { PageHeader } from "@/components/brand/page-header";
import { SiteCrest } from "@/components/brand/site-crest";
import { getSessionUser } from "@/server/auth/session";
import { getTeamProfile } from "@/server/team/service";

export const metadata = { title: "球队介绍" };

export default async function TeamPage() {
  const [profile, session] = await Promise.all([getTeamProfile(), getSessionUser()]);
  const canEdit = session?.role === "CAPTAIN";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="Club"
        title={profile.name}
        description={profile.subtitle ?? undefined}
        actions={
          canEdit ? (
            <Button size="sm" render={<Link href="/captain/team" />}>
              编辑
            </Button>
          ) : null
        }
      />

      <section className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="space-y-4">
          {profile.crestUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.crestUrl}
              alt={`${profile.name} 队徽`}
              className="w-full rounded-xl border object-cover"
            />
          ) : (
            <SiteCrest className="h-40" decorative />
          )}
          {profile.contact ? (
            <Card>
              <CardContent className="py-4 text-sm">
                <p className="text-muted-foreground mb-1">联系方式</p>
                <p className="whitespace-pre-wrap">{profile.contact}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="space-y-8">
          {profile.honors.trim() ? (
            <section>
              <h2 className="mb-3 text-xl font-bold">荣誉</h2>
              <div className="flex flex-wrap gap-2">
                {profile.honors
                  .split(/\n+/)
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => (
                    <Badge key={line} variant="secondary">
                      {line}
                    </Badge>
                  ))}
              </div>
            </section>
          ) : null}
          <section>
            <h2 className="mb-3 text-xl font-bold">简介</h2>
            {profile.summary ? (
              <p className="text-muted-foreground mb-4">{profile.summary}</p>
            ) : null}
            <ArticleContent content={profile.contentJson} />
          </section>
        </div>
      </section>

      {profile.images.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">球队图片</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.images.map((image) => (
              <figure key={image.assetId} className="overflow-hidden rounded-xl border">
                {image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={image.caption || "球队图片"}
                    className="h-48 w-full object-cover"
                  />
                ) : null}
                {image.caption ? (
                  <figcaption className="text-muted-foreground px-3 py-2 text-sm">
                    {image.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
