import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/server/env";

const globalForS3 = globalThis as unknown as {
  eicS3?: S3Client;
  eicS3Presign?: S3Client;
};

function clientConfig(endpoint: string) {
  return {
    endpoint,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  };
}

export const s3 =
  globalForS3.eicS3 ?? new S3Client(clientConfig(env.S3_ENDPOINT));

const publicEndpoint = new URL(env.S3_PUBLIC_BASE_URL).origin;
const internalOrigin = new URL(env.S3_ENDPOINT).origin;

export const s3Presign =
  globalForS3.eicS3Presign ??
  (publicEndpoint === internalOrigin ? s3 : new S3Client(clientConfig(publicEndpoint)));

if (process.env.NODE_ENV !== "production") {
  globalForS3.eicS3 = s3;
  globalForS3.eicS3Presign = s3Presign;
}
