-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "name_en" TEXT,
ADD COLUMN     "name_vi" TEXT,
ADD COLUMN     "name_zh" TEXT;

-- Update existing departments: set name_vi = name for backward compatibility
UPDATE "departments" SET "name_vi" = "name" WHERE "name_vi" IS NULL;
