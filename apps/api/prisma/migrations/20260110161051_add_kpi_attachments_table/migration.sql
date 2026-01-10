-- CreateTable
CREATE TABLE "kpi_attachments" (
    "id" TEXT NOT NULL,
    "kpi_record_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_attachments_kpi_record_id_idx" ON "kpi_attachments"("kpi_record_id");

-- CreateIndex
CREATE INDEX "kpi_attachments_document_id_idx" ON "kpi_attachments"("document_id");

-- CreateIndex
CREATE INDEX "kpi_attachments_created_by_id_idx" ON "kpi_attachments"("created_by_id");

-- AddForeignKey
ALTER TABLE "kpi_attachments" ADD CONSTRAINT "kpi_attachments_kpi_record_id_fkey" FOREIGN KEY ("kpi_record_id") REFERENCES "kpi_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_attachments" ADD CONSTRAINT "kpi_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_attachments" ADD CONSTRAINT "kpi_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
