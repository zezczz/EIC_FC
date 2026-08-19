import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env.test")) {
  loadDotenv({ path: ".env.test", override: true });
} else if (existsSync(".env.local")) {
  loadDotenv({ path: ".env.local", override: true });
} else if (existsSync(".env.example")) {
  loadDotenv({ path: ".env.example", override: true });
}

if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
process.env.APP_URL ||= "http://localhost:3000";
process.env.AUTH_SECRET ||= "test-auth-secret-32chars-minimum!!";
process.env.TRUSTED_ORIGINS ||= "http://localhost:3000";
process.env.DATABASE_URL ||= "postgresql://eicfc:eicfc_dev_password@localhost:5432/eicfc_test";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
process.env.S3_ENDPOINT ||= "http://localhost:9000";
process.env.S3_REGION ||= "us-east-1";
process.env.S3_BUCKET ||= "eicfc";
process.env.S3_ACCESS_KEY_ID ||= "minioadmin";
process.env.S3_SECRET_ACCESS_KEY ||= "minioadmin";
process.env.S3_PUBLIC_BASE_URL ||= "http://localhost:9000/eicfc";
process.env.S3_FORCE_PATH_STYLE ||= "true";
