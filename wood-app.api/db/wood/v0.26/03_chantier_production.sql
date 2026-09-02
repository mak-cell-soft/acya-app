-- Migration: v0.26 / 03_chantier_production.sql
-- Description: Construction project phases and operational tasks.
-- Architecture: Configurable phases (not hardcoded) each containing tasks with progress tracking.

CREATE TABLE IF NOT EXISTS chantier_phases (
    "Id"             SERIAL       PRIMARY KEY,
    "ChantierId"     INT          NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "Name"           VARCHAR(200) NOT NULL, -- Configurable (e.g. 'Gros œuvre', 'Second œuvre', 'Finitions')
    "Description"    TEXT,
    "SortOrder"      INT          NOT NULL DEFAULT 0,
    "ProgressPct"    INT          NOT NULL DEFAULT 0 CHECK ("ProgressPct" BETWEEN 0 AND 100),
    "Color"          VARCHAR(20),
    "Status"         SMALLINT     NOT NULL DEFAULT 0, -- 0: Planned, 1: InProgress, 2: Completed, 3: Cancelled
    "StartDate"      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "PlannedEndDate" TIMESTAMP WITHOUT TIME ZONE,
    "ActualEndDate"  TIMESTAMP WITHOUT TIME ZONE,
    "CreationDate"   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "IsDeleted"      BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS chantier_tasks (
    "Id"                  SERIAL       PRIMARY KEY,
    "PhaseId"             INT          NOT NULL REFERENCES chantier_phases("Id") ON DELETE CASCADE,
    "Label"               VARCHAR(200) NOT NULL, -- e.g. 'Fondations'
    "SubLabel"            VARCHAR(200),          -- e.g. 'Semelles isolées'
    "Description"         TEXT,
    "Status"              SMALLINT     NOT NULL DEFAULT 0, -- 0: Planned, 1: InProgress, 2: Done, 3: Blocked, 4: Cancelled
    "ProgressPct"         INT          NOT NULL DEFAULT 0 CHECK ("ProgressPct" BETWEEN 0 AND 100),
    "StartDate"           TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "PlannedEndDate"      TIMESTAMP WITHOUT TIME ZONE,
    "ActualEndDate"       TIMESTAMP WITHOUT TIME ZONE,
    "ResponsiblePersonId" INT          REFERENCES "Persons"("Id") ON DELETE SET NULL,
    "SortOrder"           INT          NOT NULL DEFAULT 0,
    "CreationDate"        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdateDate"          TIMESTAMP WITHOUT TIME ZONE,
    "IsDeleted"           BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_chantier_phases_cid  ON chantier_phases("ChantierId", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_chantier_tasks_phase ON chantier_tasks("PhaseId", "IsDeleted");
