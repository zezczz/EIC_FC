-- AlterTable
ALTER TABLE "Article" ADD COLUMN "coverUrl" VARCHAR(2048);

-- AlterTable
ALTER TABLE "RelayEntry" ADD COLUMN "companionNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
