-- Migration: v0.26 / 04_chantier_materials.sql
-- Description: Material planning (requirements) and actual consumption ledger.
-- Architecture: Option C — strictly dedicated ledger. Zero modification to core stock engine.
-- SourceStockMovementId offers optional read-only traceability back to stock operations.

CREATE TABLE IF NOT EXISTS chantier_material_requirements (
    "Id"                     SERIAL        PRIMARY KEY,
    "ChantierId"             INT           NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "MerchandiseId"          INT           NOT NULL REFERENCES tbl_merchandise(id) ON DELETE RESTRICT,
    "MerchandiseRef"         VARCHAR(100)  NOT NULL, -- Denormalized for rapid query and historical snapshot
    "MerchandiseDesignation" VARCHAR(500)  NOT NULL,
    "Category"               VARCHAR(100)  NOT NULL DEFAULT 'Principal',
    "MaterialType"           VARCHAR(50)   NOT NULL DEFAULT 'Principal', -- 'Principal' | 'Consumable'
    "RequiredQty"            NUMERIC(18,3) NOT NULL DEFAULT 0,
    "Unit"                   VARCHAR(50)   NOT NULL DEFAULT 'Unite',
    "MinimumQty"             NUMERIC(18,3) NOT NULL DEFAULT 0, -- Threshold for low-stock warnings
    "CreationDate"           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "IsDeleted"              BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS chantier_material_consumptions (
    "Id"                    SERIAL        PRIMARY KEY,
    "ChantierId"            INT           NOT NULL REFERENCES chantier_projects("Id") ON DELETE CASCADE,
    "MerchandiseId"         INT           NOT NULL REFERENCES tbl_merchandise(id) ON DELETE RESTRICT,
    "SourceStockMovementId" INT,          -- Logical FK to StockMovement.Id for audit trail (no hard DB constraint)
    "ChantierTaskId"        INT           REFERENCES chantier_tasks("Id") ON DELETE SET NULL,
    "ConsumedQty"           NUMERIC(18,3) NOT NULL,
    "Unit"                  VARCHAR(50)   NOT NULL DEFAULT 'Unite',
    "Notes"                 TEXT,
    "ConsumedAt"            TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "RecordedById"          INT           NOT NULL -- AppUser.Id
);

CREATE INDEX IF NOT EXISTS idx_chantier_matreq_cid      ON chantier_material_requirements("ChantierId", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_chantier_consumption_cid ON chantier_material_consumptions("ChantierId");
CREATE INDEX IF NOT EXISTS idx_chantier_consumption_mid ON chantier_material_consumptions("MerchandiseId");
