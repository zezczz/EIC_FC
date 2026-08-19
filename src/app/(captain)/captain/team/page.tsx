import { PageHeader } from "@/components/brand/page-header";
import { TeamProfileForm } from "@/components/team/team-profile-form";
import { requireCaptain } from "@/server/auth/guards";
import { getTeamProfile } from "@/server/team/service";

export const metadata = { title: "球队信息", robots: { index: false } };

export default async function CaptainTeamPage() {
  await requireCaptain();
  const profile = await getTeamProfile();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Club"
        title="球队信息"
        description="编辑队名、荣誉、队徽、图片、联系方式和简介"
      />
      <TeamProfileForm initial={profile} />
    </div>
  );
}
