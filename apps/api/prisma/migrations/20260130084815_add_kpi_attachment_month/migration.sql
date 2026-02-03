-- AlterTable
ALTER TABLE "kpi_attachments" ADD COLUMN "month" INTEGER;

-- CreateIndex
CREATE INDEX "kpi_attachments_kpi_record_id_month_idx" ON "kpi_attachments"("kpi_record_id", "month");
