CREATE TYPE "InternalFolderType" AS ENUM ('VERSIONS', 'DELETE_FILES');

-- AlterTable
ALTER TABLE "folders"
ADD COLUMN     "is_internal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internal_type" "InternalFolderType";
