-- AlterTable
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "folders_deleted_at_idx" ON "folders"("deleted_at");


