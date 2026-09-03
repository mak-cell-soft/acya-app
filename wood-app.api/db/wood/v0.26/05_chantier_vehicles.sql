-- Migration: v0.26 / 05_chantier_vehicles.sql
-- Description: Vehicle assignments to chantiers (Magasin tab).
-- Architecture: Reuses existing Vehicles table and Persons table for designated drivers.

CREATE TABLE IF NOT EXISTS chantier_vehicle_assignments (
    "Id"             SERIAL       PRIMARY KEY,
    "ChantierId"     INT          NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "VehicleId"      INT          NOT NULL REFERENCES tbl_vehicle(id) ON DELETE CASCADE,
    "DriverPersonId" INT          REFERENCES tbl_person(id) ON DELETE SET NULL,
    "AssignedAt"     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "ReleasedAt"     TIMESTAMP WITHOUT TIME ZONE,
    "IsActive"       BOOLEAN      NOT NULL DEFAULT TRUE,
    "Notes"          TEXT,
    "CreationDate"   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chantier_vehicles_cid ON chantier_vehicle_assignments("ChantierId");
CREATE INDEX IF NOT EXISTS idx_chantier_vehicles_vid ON chantier_vehicle_assignments("VehicleId");
