-- CreateEnum
CREATE TYPE "RowMode" AS ENUM ('SINGLE', 'DOUBLE');

-- AlterTable
ALTER TABLE "kpi_records" ADD COLUMN     "row_mode" "RowMode";
