-- Migration: v0.26 / 02_chantier_team.sql
-- Description: Team member assignments to chantiers.
-- Architecture: Strictly links to existing Person table. NO duplicate employee entities created.

CREATE TABLE IF NOT EXISTS chantier_team_members (
    "Id"           SERIAL       PRIMARY KEY,
    "ChantierId"   INT          NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "PersonId"     INT          NOT NULL REFERENCES "Persons"("Id") ON DELETE RESTRICT,
    "ChantierRole" VARCHAR(100) NOT NULL, -- Free text (e.g. 'Chef de chantier', 'Conducteur de travaux', 'Ouvrier', etc.)
    "AssignedAt"   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "ReleasedAt"   TIMESTAMP WITHOUT TIME ZONE,
    "IsActive"     BOOLEAN      NOT NULL DEFAULT TRUE,
    "AssignedById" INT          NOT NULL, -- AppUser.Id
    "CreationDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE ("ChantierId", "PersonId", "IsActive")
);

CREATE INDEX IF NOT EXISTS idx_chantier_team_chantier ON chantier_team_members("ChantierId");
CREATE INDEX IF NOT EXISTS idx_chantier_team_person   ON chantier_team_members("PersonId");
