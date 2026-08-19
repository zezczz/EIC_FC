import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { errConflict, errForbidden, errNotFound } from "@/server/errors";
import { extractPlainText } from "@/server/articles/renderer";
import type { TeamProfileUpdateInput } from "@/schemas/team";

const TEAM_PROFILE_ID = "default";

export type TeamContext = {
  actorId: string;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function mediaUrl(storageKey?: string | null, status?: string | null) {
  if (!storageKey || status !== "READY") return null;
  return `/api/media/${storageKey}`;
}

async function assertTeamAsset(
  assetId: string,
  actorId: string,
  purpose: "TEAM_CREST" | "TEAM_GALLERY",
) {
  const asset = await db.mediaAsset.findFirst({
    where: {
      id: assetId,
      uploadedById: actorId,
      purpose,
      status: "READY",
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!asset) throw errForbidden("球队图片不可用或无权使用");
}

export async function getTeamProfile() {
  const profile = await db.teamProfile.findUnique({
    where: { id: TEAM_PROFILE_ID },
    include: {
      crestAsset: { select: { storageKey: true, status: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        include: { asset: { select: { id: true, storageKey: true, status: true } } },
      },
    },
  });
  if (!profile) {
    return {
      id: TEAM_PROFILE_ID,
      name: "EIC FC",
      subtitle: "华科电信足球队",
      contact: null as string | null,
      honors: "",
      summary: "与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。",
      contentJson: EMPTY_DOC,
      plainText: "与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。",
      crestAssetId: null as string | null,
      crestUrl: null as string | null,
      version: 1,
      images: [] as Array<{
        assetId: string;
        caption: string | null;
        url: string | null;
        sortOrder: number;
      }>,
    };
  }
  return {
    id: profile.id,
    name: profile.name,
    subtitle: profile.subtitle,
    contact: profile.contact,
    honors: profile.honors,
    summary: profile.summary,
    contentJson: profile.contentJson,
    plainText: profile.plainText,
    crestAssetId: profile.crestAssetId,
    crestUrl: mediaUrl(profile.crestAsset?.storageKey, profile.crestAsset?.status),
    version: profile.version,
    images: profile.images.map((image) => ({
      assetId: image.assetId,
      caption: image.caption,
      url: mediaUrl(image.asset.storageKey, image.asset.status),
      sortOrder: image.sortOrder,
    })),
  };
}

export async function updateTeamProfile(input: TeamProfileUpdateInput, ctx: TeamContext) {
  if (input.crestAssetId) {
    await assertTeamAsset(input.crestAssetId, ctx.actorId, "TEAM_CREST");
  }
  for (const image of input.images) {
    await assertTeamAsset(image.assetId, ctx.actorId, "TEAM_GALLERY");
  }

  const plainText = extractPlainText(input.contentJson);
  const updated = await db.$transaction(async (tx) => {
    const current = await tx.teamProfile.findUnique({ where: { id: TEAM_PROFILE_ID } });
    if (!current) throw errNotFound("球队资料不存在");
    if (current.version !== input.version) {
      throw errConflict("球队资料已被其他人更新，请刷新后重试");
    }

    await tx.teamImage.deleteMany({ where: { teamProfileId: TEAM_PROFILE_ID } });
    if (input.images.length > 0) {
      await tx.teamImage.createMany({
        data: input.images.map((image, index) => ({
          id: randomUUID(),
          teamProfileId: TEAM_PROFILE_ID,
          assetId: image.assetId,
          caption: image.caption ?? null,
          sortOrder: index,
        })),
      });
    }

    return tx.teamProfile.update({
      where: { id: TEAM_PROFILE_ID },
      data: {
        name: input.name,
        subtitle: input.subtitle ?? null,
        contact: input.contact ?? null,
        honors: input.honors,
        summary: input.summary,
        contentJson: input.contentJson as Prisma.InputJsonValue,
        plainText,
        crestAssetId: input.crestAssetId === undefined ? undefined : input.crestAssetId,
        version: { increment: 1 },
        updatedById: ctx.actorId,
      },
    });
  });

  await writeAudit({
    actorId: ctx.actorId,
    action: "TEAM_PROFILE_UPDATE",
    resourceType: "TEAM_PROFILE",
    resourceId: TEAM_PROFILE_ID,
    after: {
      name: updated.name,
      subtitle: updated.subtitle,
      contact: updated.contact,
      honors: updated.honors,
      version: updated.version,
    },
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  try {
    revalidatePath("/");
    revalidatePath("/team");
  } catch {
    // 非 Next.js 请求上下文（测试/脚本）忽略缓存刷新
  }
  return getTeamProfile();
}
