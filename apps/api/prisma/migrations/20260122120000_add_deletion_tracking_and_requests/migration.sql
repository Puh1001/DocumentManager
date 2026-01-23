-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "uploaded_by" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "uploaded_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deletion_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "deletion_requests" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "replacement_file_id" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deletion_requests_document_id_idx" ON "deletion_requests"("document_id");
CREATE INDEX IF NOT EXISTS "deletion_requests_requested_by_idx" ON "deletion_requests"("requested_by");
CREATE INDEX IF NOT EXISTS "deletion_requests_status_idx" ON "deletion_requests"("status");
CREATE INDEX IF NOT EXISTS "deletion_requests_reviewed_by_idx" ON "deletion_requests"("reviewed_by");
CREATE INDEX IF NOT EXISTS "deletion_requests_status_requested_at_idx" ON "deletion_requests"("status", "requested_at");
CREATE INDEX IF NOT EXISTS "documents_uploaded_by_idx" ON "documents"("uploaded_by");
CREATE INDEX IF NOT EXISTS "documents_deletion_expires_at_idx" ON "documents"("deletion_expires_at");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "deletion_requests_document_id_key" ON "deletion_requests"("document_id");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'documents_uploaded_by_fkey'
    ) THEN
        ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" 
            FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deletion_requests_document_id_fkey'
    ) THEN
        ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_document_id_fkey" 
            FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deletion_requests_requested_by_fkey'
    ) THEN
        ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_requested_by_fkey" 
            FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deletion_requests_reviewed_by_fkey'
    ) THEN
        ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_reviewed_by_fkey" 
            FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'deletion_requests_replacement_file_id_fkey'
    ) THEN
        ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_replacement_file_id_fkey" 
            FOREIGN KEY ("replacement_file_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
