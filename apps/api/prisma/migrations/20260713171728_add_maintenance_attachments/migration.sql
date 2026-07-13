-- CreateTable
CREATE TABLE "maintenance_attachments" (
    "id" TEXT NOT NULL,
    "maintenance_notice_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_attachments_maintenance_notice_id_idx" ON "maintenance_attachments"("maintenance_notice_id");

-- CreateIndex
CREATE INDEX "maintenance_attachments_document_id_idx" ON "maintenance_attachments"("document_id");

-- CreateIndex
CREATE INDEX "maintenance_attachments_created_by_id_idx" ON "maintenance_attachments"("created_by_id");

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_maintenance_notice_id_fkey" FOREIGN KEY ("maintenance_notice_id") REFERENCES "maintenance_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
