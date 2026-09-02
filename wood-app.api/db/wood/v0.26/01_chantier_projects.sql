-- Migration: v0.26 / 01_chantier_projects.sql
-- Description: Core table for construction site management (Chantier projects).
-- Architecture: Additive only. No modifications to existing tables.
-- Schema isolation: Runs within the tenant schema automatically via WoodAppContext default schema.

CREATE TABLE IF NOT EXISTS chantier_projects (
    "Id"                     SERIAL       PRIMARY KEY,
    "Guid"                   UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    "Reference"              VARCHAR(50)  NOT NULL,
    "Name"                   VARCHAR(255) NOT NULL,
    "Description"            TEXT,
    "InternalNote"           TEXT,
    "Location"               VARCHAR(500),
    "Gouvernorate"           VARCHAR(100),
    "Status"                 SMALLINT     NOT NULL DEFAULT 0,  -- 0: Planned, 1: InProgress, 2: OnHold, 3: Completed, 4: Cancelled
    "HealthFlag"             SMALLINT     NOT NULL DEFAULT 0,  -- 0: Green, 1: Orange, 2: Red
    "ProgressPct"            INT          NOT NULL DEFAULT 0 CHECK ("ProgressPct" BETWEEN 0 AND 100),
    "BudgetTotal"            NUMERIC(18,3),
    "StartDate"              TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "PlannedEndDate"         TIMESTAMP WITHOUT TIME ZONE,
    "ActualEndDate"          TIMESTAMP WITHOUT TIME ZONE,
    "ArchitectPersonId"      INT          REFERENCES "Persons"("Id") ON DELETE SET NULL,
    "ProjectManagerPersonId" INT          REFERENCES "Persons"("Id") ON DELETE SET NULL,
    "ClientCounterPartId"    INT,                              -- Logical FK to CounterPart, no direct constraint for loose coupling
    "CreatedById"            INT          NOT NULL,            -- FK to AppUser.Id
    "UpdatedById"            INT,                              -- FK to AppUser.Id
    "CreationDate"           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdateDate"             TIMESTAMP WITHOUT TIME ZONE,
    "IsDeleted"              BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_chantier_projects_status ON chantier_projects("Status", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_chantier_projects_dates  ON chantier_projects("StartDate", "PlannedEndDate");
CREATE INDEX IF NOT EXISTS idx_chantier_projects_guid   ON chantier_projects("Guid");
