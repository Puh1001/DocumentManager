-- AlterTable: revision label A/0 (original), A/1..A/10, B/0..B/10, etc.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "revision_label" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_revision_label_idx" ON "documents"("revision_label");
