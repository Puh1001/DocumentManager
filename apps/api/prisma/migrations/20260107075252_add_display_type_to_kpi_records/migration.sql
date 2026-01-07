-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('PERCENTAGE', 'COUNT');

-- AlterTable
ALTER TABLE "kpi_records" ADD COLUMN     "display_type" "DisplayType" NOT NULL DEFAULT 'PERCENTAGE';
