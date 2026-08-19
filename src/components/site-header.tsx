import { getStaffSession } from "@/server/auth/guards";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { SiteHeaderBar } from "@/components/site-header-bar";

export async function SiteHeader() {
  const sessionUser = await getSessionUser();
  const staffSession = sessionUser ? await getStaffSession(sessionUser.id) : null;
  const avatar = sessionUser
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          avatarAsset: { select: { storageKey: true, status: true } },
        },
      })
    : null;
  const avatarUrl =
    avatar?.avatarAsset?.status === "READY" && avatar.avatarAsset.storageKey
      ? `/api/media/${avatar.avatarAsset.storageKey}`
      : null;

  return (
    <SiteHeaderBar
      user={
        sessionUser
          ? {
              displayName: sessionUser.displayName,
              status: sessionUser.status,
              avatarUrl,
              isStaff: Boolean(staffSession),
            }
          : null
      }
    />
  );
}
