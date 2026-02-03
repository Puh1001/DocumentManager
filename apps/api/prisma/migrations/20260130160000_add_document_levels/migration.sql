-- CreateTable
CREATE TABLE "document_levels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "name_vi" TEXT,
    "name_zh" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_levels_code_key" ON "document_levels"("code");

-- CreateIndex
CREATE INDEX "document_levels_code_idx" ON "document_levels"("code");

-- CreateIndex
CREATE INDEX "document_levels_is_active_idx" ON "document_levels"("is_active");

-- CreateIndex
CREATE INDEX "document_levels_sort_order_idx" ON "document_levels"("sort_order");

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "level_id" TEXT;

-- CreateIndex
CREATE INDEX "documents_level_id_idx" ON "documents"("level_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "document_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
