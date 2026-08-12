import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/server/env";

const globalForS3 = globalThis as unknown as { eicS3?: S3Client };

export const s3 =
  globalForS3.eicS3 ??
  new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

if (process.env.NODE_ENV !== "production") globalForS3.eicS3 = s3;
