-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

-- CreateEnum
CREATE TYPE "StaffTitle" AS ENUM ('COACH', 'VICE_CAPTAIN', 'MANAGER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffTitle" "StaffTitle",
ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Relay" ADD COLUMN IF NOT EXISTS "deletedById" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Relay_deletedAt_idx" ON "Relay"("deletedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Relay" ADD CONSTRAINT "Relay_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
