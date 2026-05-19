-- V0.16: Add Fuel Card (Carte Carburant) fields to tbl_vehicle

ALTER TABLE "tbl_vehicle"
  ADD COLUMN IF NOT EXISTS "fuelcardenterprise" VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS "fuelcardconductor" VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS "fuelcardmatricule" VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS "fuelcardamount" NUMERIC(14,3) NULL;
