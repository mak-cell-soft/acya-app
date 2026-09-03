-- Migration: v0.26 / 07_chantier_caisse.sql
-- Description: Petty cash register (Caisse de chantier) transactions: alimentations, cash out, and mobile requests.
-- Architecture: Additive ledger for on-site cash management with approval workflow for mobile requests.

CREATE TABLE IF NOT EXISTS chantier_caisse_transactions (
    "Id"                  SERIAL       PRIMARY KEY,
    "Guid"                UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    "ChantierId"          INT          NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "Type"                SMALLINT     NOT NULL DEFAULT 0, -- 0: Alimentation (Entree), 1: Sortie (Depense / Decaissement)
    "Status"              SMALLINT     NOT NULL DEFAULT 0, -- 0: Completed (Valide), 1: Pending (Demande mobile en attente), 2: Rejected (Rejete)
    "Amount"              NUMERIC(18,3) NOT NULL CHECK ("Amount" > 0),
    "TransactionDate"     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "Reason"              VARCHAR(300) NOT NULL,
    "Reference"           VARCHAR(100),
    "BeneficiaryPersonId" INT          REFERENCES tbl_person(id) ON DELETE SET NULL,
    "CreatedById"         INT          NOT NULL,
    "ValidatedById"       INT,
    "ValidationDate"      TIMESTAMP WITHOUT TIME ZONE,
    "Notes"               TEXT,
    "CreationDate"        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "IsDeleted"           BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_chantier_caisse_cid_status ON chantier_caisse_transactions("ChantierId", "Status", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_chantier_caisse_date ON chantier_caisse_transactions("ChantierId", "TransactionDate");
