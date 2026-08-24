import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";
import { handle } from "@/server/http";
import { getReadyMedia } from "@/server/media/service";
import { s3Presign } from "@/server/media/s3";

export const GET = handle(async (_request: NextRequest, { params }) => {
  const parts = params.key;
  const storageKey = Array.isArray(parts) ? parts.join("/") : parts;
  const asset = await getReadyMedia(storageKey);
  const url = await getSignedUrl(
    s3Presign,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: asset.storageKey,
      ResponseContentType: asset.mimeType,
      ResponseCacheControl: "public, max-age=3600",
    }),
    { expiresIn: 60 },
  );
  return NextResponse.redirect(url, {
    status: 307,
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
});
