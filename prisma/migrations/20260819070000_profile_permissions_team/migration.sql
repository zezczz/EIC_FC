-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- AlterEnum
ALTER TYPE "MediaPurpose" ADD VALUE IF NOT EXISTS 'TEAM_CREST';
ALTER TYPE "MediaPurpose" ADD VALUE IF NOT EXISTS 'TEAM_GALLERY';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "teamTitle" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "signature" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "studentId" VARCHAR(32),
ADD COLUMN IF NOT EXISTS "fieldPositions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "preferredFoot" "PreferredFoot",
ADD COLUMN IF NOT EXISTS "profilePermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Materialize staff presets so empty permissions now means no access.
UPDATE "User"
SET permissions = CASE "staffTitle"
  WHEN 'COACH' THEN ARRAY[
    'articles:read',
    'articles:write',
    'relays:read',
    'relays:write',
    'media:upload'
  ]
  WHEN 'VICE_CAPTAIN' THEN ARRAY[
    'users:read',
    'users:review',
    'articles:read',
    'articles:write',
    'articles:publish',
    'relays:read',
    'relays:write',
    'audit:read',
    'media:upload'
  ]
  WHEN 'MANAGER' THEN ARRAY[
    'users:read',
    'users:review',
    'relays:read',
    'relays:write',
    'audit:read'
  ]
  ELSE permissions
END
WHERE role = 'STAFF' AND cardinality(permissions) = 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamProfile" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "subtitle" VARCHAR(80),
    "contact" VARCHAR(300),
    "honors" VARCHAR(2000) NOT NULL DEFAULT '',
    "summary" VARCHAR(500) NOT NULL DEFAULT '',
    "contentJson" JSONB NOT NULL,
    "plainText" TEXT NOT NULL DEFAULT '',
    "crestAssetId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamImage" (
    "id" UUID NOT NULL,
    "teamProfileId" TEXT NOT NULL,
    "assetId" UUID NOT NULL,
    "caption" VARCHAR(120),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamProfile_crestAssetId_key" ON "TeamProfile"("crestAssetId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamImage_assetId_key" ON "TeamImage"("assetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamImage_teamProfileId_sortOrder_idx" ON "TeamImage"("teamProfileId", "sortOrder");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TeamProfile" ADD CONSTRAINT "TeamProfile_crestAssetId_fkey" FOREIGN KEY ("crestAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamProfile" ADD CONSTRAINT "TeamProfile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamImage" ADD CONSTRAINT "TeamImage_teamProfileId_fkey" FOREIGN KEY ("teamProfileId") REFERENCES "TeamProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamImage" ADD CONSTRAINT "TeamImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO "TeamProfile" (
  "id",
  "name",
  "subtitle",
  "contact",
  "honors",
  "summary",
  "contentJson",
  "plainText",
  "version"
)
VALUES (
  'default',
  'EIC FC',
  '华科电信足球队',
  NULL,
  '',
  '与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。"}]}]}'::jsonb,
  '与队友并肩作战，记录每一场球赛。球队动态、活动接龙，都在这里。',
  1
)
ON CONFLICT ("id") DO NOTHING;
