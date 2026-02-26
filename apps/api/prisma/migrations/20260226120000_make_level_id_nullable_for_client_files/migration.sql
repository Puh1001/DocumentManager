-- Make level_id nullable to support client files (which don't require a level)
-- ISO documents will still require a levelId, but client files can have null levelId

-- Drop the NOT NULL constraint on level_id
-- The existing FK constraint (ON DELETE RESTRICT) already supports NULL values,
-- so we only need to make the column nullable
ALTER TABLE "documents" ALTER COLUMN "level_id" DROP NOT NULL;
