-- Add ImageUrl column to Article table
ALTER TABLE "tbl_article"
  ADD COLUMN IF NOT EXISTS "imageurl" TEXT NULL;
