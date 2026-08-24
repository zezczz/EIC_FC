-- DropIndex
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_emailNormalized_key";
DROP INDEX IF EXISTS "User_emailNormalized_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
DROP COLUMN "emailNormalized";
