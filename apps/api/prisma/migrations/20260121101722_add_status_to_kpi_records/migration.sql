-- CreateEnum
CREATE TYPE "KpiStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "kpi_records" ADD COLUMN "status" "KpiStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "kpi_records_status_idx" ON "kpi_records"("status");
