-- Add IsOwned column to Vehicle table
ALTER TABLE "tbl_vehicle"
  ADD COLUMN IF NOT EXISTS "isowned" BOOLEAN NOT NULL DEFAULT FALSE;
