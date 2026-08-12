-- CreateEnum
CREATE TYPE "AuthAttemptKind" AS ENUM ('LOGIN', 'REGISTER');

-- AlterTable
ALTER TABLE "LoginAttempt" ADD COLUMN "kind" "AuthAttemptKind" NOT NULL DEFAULT 'LOGIN';

-- DropIndex
DROP INDEX IF EXISTS "LoginAttempt_identityHash_createdAt_idx";
DROP INDEX IF EXISTS "LoginAttempt_ipHash_createdAt_idx";

-- CreateIndex
CREATE INDEX "LoginAttempt_kind_identityHash_createdAt_idx" ON "LoginAttempt"("kind", "identityHash", "createdAt");
CREATE INDEX "LoginAttempt_kind_ipHash_createdAt_idx" ON "LoginAttempt"("kind", "ipHash", "createdAt");
