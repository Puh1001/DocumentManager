-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "department_id" TEXT;

-- CreateIndex
CREATE INDEX "folders_department_id_idx" ON "folders"("department_id");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Migration: Link existing folders to departments by name matching
-- Match folder name with department name (case-insensitive)
UPDATE "folders" f
SET "department_id" = d.id
FROM "departments" d
WHERE LOWER(TRIM(f.name)) = LOWER(TRIM(d.name))
  AND f."parent_id" IS NULL  -- Only root folders (department folders)
  AND f."department_id" IS NULL;  -- Only update if not already set
