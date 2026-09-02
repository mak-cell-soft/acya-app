-- Migration: v0.26 / 06_chantier_suivi.sql
-- Description: Construction progress entries (journal de chantier) and project alerts.
-- Architecture: Dedicated event stream for timeline events, observations, and resolved/unresolved issues.

CREATE TABLE IF NOT EXISTS chantier_progress_entries (
    "Id"           SERIAL       PRIMARY KEY,
    "ChantierId"   INT          NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "Title"        VARCHAR(300) NOT NULL,
    "Description"  TEXT,
    "EntryType"    SMALLINT     NOT NULL DEFAULT 0, -- 0: DailyReport, 1: Milestone, 2: Observation, 3: Issue
    "EntryStatus"  SMALLINT     NOT NULL DEFAULT 0, -- 0: Done, 1: Pending, 2: Cancelled
    "EntryDate"    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "RecordedById" INT          NOT NULL,           -- AppUser.Id
    "CreationDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "IsDeleted"    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS chantier_alerts (
    "Id"         SERIAL       PRIMARY KEY,
    "ChantierId" INT          NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "Message"    TEXT         NOT NULL,
    "AlertType"  SMALLINT     NOT NULL DEFAULT 1, -- 0: Critical, 1: Warning, 2: Info
    "IsResolved" BOOLEAN      NOT NULL DEFAULT FALSE,
    "CreatedAt"  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "ResolvedAt" TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_chantier_progress_cid ON chantier_progress_entries("ChantierId", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_chantier_alerts_cid   ON chantier_alerts("ChantierId", "IsResolved");
