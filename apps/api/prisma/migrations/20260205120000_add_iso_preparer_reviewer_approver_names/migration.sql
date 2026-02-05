-- Add ISO document name columns (full names entered by user)
ALTER TABLE "documents" ADD COLUMN "preparer_name" TEXT;
ALTER TABLE "documents" ADD COLUMN "reviewer_name" TEXT;
ALTER TABLE "documents" ADD COLUMN "approver_name" TEXT;
