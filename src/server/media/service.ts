import { createHash, randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import type { MediaPurpose } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { AppError, errConflict, errNotFound } from "@/server/errors";
import { writeAudit } from "@/server/audit";
import { s3 } from "@/server/media/s3";

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type MediaContext = {
  actorId: string;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

async function objectBuffer(storageKey: string): Promise<Buffer> {
  const object = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));
  if (!object.Body) throw new AppError("MEDIA_REJECTED", "上传对象为空");
  const bytes = await object.Body.transformToByteArray();
  if (bytes.byteLength > env.MAX_IMAGE_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "图片超过大小限制");
  }
  return Buffer.from(bytes);
}

async function audit(ctx: MediaContext, action: string, id: string, after?: unknown) {
  await writeAudit({
    actorId: ctx.actorId,
    action,
    resourceType: "MEDIA",
    resourceId: id,
    after,
    requestId: ctx.requestId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function createUploadIntent(
  input: {
    originalName: string;
    mimeType: keyof typeof MIME_EXTENSIONS;
    sizeBytes: number;
    purpose: MediaPurpose;
  },
  ctx: MediaContext,
) {
  if (input.sizeBytes > env.MAX_IMAGE_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "图片超过大小限制");
  }
  const extension = MIME_EXTENSIONS[input.mimeType];
  const now = new Date();
  const storageKey = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}/${randomUUID()}.${extension}`;
  const asset = await db.mediaAsset.create({
    data: {
      storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      sha256: "0".repeat(64),
      purpose: input.purpose,
      uploadedById: ctx.actorId,
    },
    select: { id: true, storageKey: true, status: true },
  });
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      ContentType: input.mimeType,
    }),
    { expiresIn: 300 },
  );
  await audit(ctx, "MEDIA_PRESIGN", asset.id, { purpose: input.purpose });
  return { asset, uploadUrl, expiresIn: 300 };
}

export async function completeUpload(id: string, ctx: MediaContext) {
  const asset = await db.mediaAsset.findFirst({
    where: { id, uploadedById: ctx.actorId, status: "UPLOADING", deletedAt: null },
  });
  if (!asset) throw errNotFound("上传任务不存在");

  try {
    const source = await objectBuffer(asset.storageKey);
    const image = sharp(source, { limitInputPixels: env.MAX_IMAGE_PIXELS });
    const metadata = await image.metadata();
    const expectedFormat =
      asset.mimeType === "image/jpeg" ? "jpeg" : asset.mimeType === "image/png" ? "png" : "webp";
    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > env.MAX_IMAGE_PIXELS
    ) {
      throw new AppError("MEDIA_REJECTED", "图片格式、尺寸或文件内容不合法");
    }

    let pipeline = image.rotate();
    if (expectedFormat === "jpeg") pipeline = pipeline.jpeg({ quality: 88 });
    if (expectedFormat === "png") pipeline = pipeline.png({ compressionLevel: 9 });
    if (expectedFormat === "webp") pipeline = pipeline.webp({ quality: 88 });
    const output = await pipeline.toBuffer();
    if (output.byteLength > env.MAX_IMAGE_BYTES) {
      throw new AppError("PAYLOAD_TOO_LARGE", "处理后的图片超过大小限制");
    }
    const cleanMetadata = await sharp(output).metadata();
    const sha256 = createHash("sha256").update(output).digest("hex");
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: asset.storageKey,
        Body: output,
        ContentType: asset.mimeType,
      }),
    );
    const ready = await db.mediaAsset.update({
      where: { id },
      data: {
        status: "READY",
        sizeBytes: BigInt(output.byteLength),
        width: cleanMetadata.width,
        height: cleanMetadata.height,
        sha256,
      },
      select: {
        id: true,
        storageKey: true,
        mimeType: true,
        width: true,
        height: true,
        purpose: true,
        status: true,
      },
    });
    await audit(ctx, "MEDIA_COMPLETE", id, {
      status: ready.status,
      width: ready.width,
      height: ready.height,
    });
    return ready;
  } catch (error) {
    await Promise.allSettled([
      s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: asset.storageKey })),
      db.mediaAsset.update({ where: { id }, data: { status: "REJECTED" } }),
    ]);
    if (error instanceof AppError) throw error;
    throw new AppError("MEDIA_REJECTED", "图片校验失败", { cause: error });
  }
}

export async function deleteMedia(id: string, ctx: MediaContext) {
  const asset = await db.mediaAsset.findUnique({
    where: { id },
    include: {
      avatarUser: { select: { id: true } },
      articleCovers: { select: { id: true } },
      teamCrest: { select: { id: true } },
      teamGallery: { select: { id: true } },
    },
  });
  if (!asset || asset.deletedAt) throw errNotFound("媒体不存在");
  if (
    asset.avatarUser ||
    asset.articleCovers.length > 0 ||
    asset.teamCrest ||
    asset.teamGallery.length > 0
  ) {
    throw errConflict("媒体正在使用中，不能删除");
  }
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: asset.storageKey }));
  await db.mediaAsset.update({
    where: { id },
    data: { status: "DELETED", deletedAt: new Date() },
  });
  await audit(ctx, "MEDIA_DELETE", id, { status: "DELETED" });
  return { id, status: "DELETED" as const };
}

export async function getReadyMedia(storageKey: string) {
  const asset = await db.mediaAsset.findFirst({
    where: { storageKey, status: "READY", deletedAt: null },
    select: { storageKey: true, mimeType: true },
  });
  if (!asset) throw errNotFound("媒体不存在");
  return asset;
}
