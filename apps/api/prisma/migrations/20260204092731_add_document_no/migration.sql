-- AlterTable: only add document_no (do not change uploaded_at to avoid drift)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_no" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_document_no_idx" ON "documents"("document_no");
