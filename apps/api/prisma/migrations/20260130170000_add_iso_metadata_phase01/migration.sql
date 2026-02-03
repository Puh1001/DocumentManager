-- Phase 01: Add ISO metadata fields and make level_id required.

-- 1. Add new ISO metadata columns (nullable)
ALTER TABLE "documents" ADD COLUMN "preparer_id" TEXT;
ALTER TABLE "documents" ADD COLUMN "reviewer_id" TEXT;
ALTER TABLE "documents" ADD COLUMN "approver_id" TEXT;
ALTER TABLE "documents" ADD COLUMN "approval_date" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN "receipt_date" TIMESTAMP(3);

-- 2. Ensure default level exists for backfill (LEVEL1)
INSERT INTO "document_levels" ("id", "code", "name", "name_en", "name_vi", "name_zh", "is_active", "sort_order", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'LEVEL1', 'Level 1', 'Level 1', 'Cấp 1', '级别1', true, 1, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- 3. Backfill level_id for existing documents (set to LEVEL1 where null)
UPDATE "documents"
SET "level_id" = (SELECT "id" FROM "document_levels" WHERE "code" = 'LEVEL1' LIMIT 1)
WHERE "level_id" IS NULL;

-- 4. Drop existing level_id FK (ON DELETE SET NULL), then make column NOT NULL
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_level_id_fkey";
ALTER TABLE "documents" ALTER COLUMN "level_id" SET NOT NULL;

-- 5. Re-add level_id FK with ON DELETE RESTRICT
ALTER TABLE "documents" ADD CONSTRAINT "documents_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "document_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Add FKs for preparer, reviewer, approver to users
ALTER TABLE "documents" ADD CONSTRAINT "documents_preparer_id_fkey" FOREIGN KEY ("preparer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Create indexes for new columns
CREATE INDEX IF NOT EXISTS "documents_preparer_id_idx" ON "documents"("preparer_id");
CREATE INDEX IF NOT EXISTS "documents_reviewer_id_idx" ON "documents"("reviewer_id");
CREATE INDEX IF NOT EXISTS "documents_approver_id_idx" ON "documents"("approver_id");
CREATE INDEX IF NOT EXISTS "documents_approval_date_idx" ON "documents"("approval_date");
CREATE INDEX IF NOT EXISTS "documents_receipt_date_idx" ON "documents"("receipt_date");
