-- Migration: v0.28 / V0.28__add_production_module.sql
-- Description: Production Module tables (production_orders, production_steps, production_inputs) and feature flag.
-- Architecture: Additive only. No modifications to existing tables.

-- 1. Feature flag on tbl_enterprise
ALTER TABLE IF EXISTS tbl_enterprise 
ADD COLUMN IF NOT EXISTS ismanagingproduction BOOLEAN DEFAULT FALSE;

-- 2. Core table for production orders
CREATE TABLE IF NOT EXISTS production_orders (
    "Id"                     SERIAL       PRIMARY KEY,
    "Guid"                   UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    "Reference"              VARCHAR(50)  NOT NULL,
    "Description"            TEXT,
    "Notes"                  TEXT,
    "SalesSiteId"            INT          NOT NULL REFERENCES tbl_sales_sites(id) ON DELETE RESTRICT,
    "Status"                 SMALLINT     NOT NULL DEFAULT 0, -- 0: Planned, 1: InProgress, 2: Completed, 3: Validated, 4: Cancelled
    "PlannedStartDate"       TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "PlannedEndDate"         TIMESTAMP WITHOUT TIME ZONE,
    "ActualStartDate"        TIMESTAMP WITHOUT TIME ZONE,
    "ActualEndDate"          TIMESTAMP WITHOUT TIME ZONE,
    "TotalMaterialCost"      NUMERIC(18,3),
    "TotalLaborCost"         NUMERIC(18,3),
    "TotalOtherCost"         NUMERIC(18,3),
    "TotalProductionCost"    NUMERIC(18,3),
    "UnitProductionCost"     NUMERIC(18,3),
    "PlannedOutputQuantity"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ActualOutputQuantity"   DOUBLE PRECISION,
    "CreatedById"            INT          NOT NULL,
    "UpdatedById"            INT,
    "CreationDate"           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdateDate"             TIMESTAMP WITHOUT TIME ZONE,
    "IsDeleted"              BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_production_orders_status  ON production_orders("Status", "IsDeleted");
CREATE INDEX IF NOT EXISTS idx_production_orders_site    ON production_orders("SalesSiteId");
CREATE INDEX IF NOT EXISTS idx_production_orders_ref     ON production_orders("Reference");
CREATE INDEX IF NOT EXISTS idx_production_orders_guid    ON production_orders("Guid");

-- 3. Production steps
CREATE TABLE IF NOT EXISTS production_steps (
    "Id"                     SERIAL       PRIMARY KEY,
    "Guid"                   UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    "ProductionOrderId"      INT          NOT NULL REFERENCES production_orders("Id") ON DELETE CASCADE,
    "StepNumber"             INT          NOT NULL DEFAULT 1,
    "Name"                   VARCHAR(255) NOT NULL,
    "Description"            TEXT,
    "Status"                 SMALLINT     NOT NULL DEFAULT 0, -- 0: Planned, 1: InProgress, 2: Completed, 3: Cancelled
    "StartDate"              TIMESTAMP WITHOUT TIME ZONE,
    "EndDate"                TIMESTAMP WITHOUT TIME ZONE,
    "LaborCost"              NUMERIC(18,3),
    "OtherCost"              NUMERIC(18,3),
    "OutputMerchandiseId"    INT          REFERENCES tbl_merchandise(id) ON DELETE SET NULL,
    "PlannedOutputQuantity"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ActualOutputQuantity"   DOUBLE PRECISION,
    "CreatedById"            INT          NOT NULL,
    "UpdatedById"            INT,
    "CreationDate"           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdateDate"             TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_production_steps_order ON production_steps("ProductionOrderId", "StepNumber");
CREATE INDEX IF NOT EXISTS idx_production_steps_stat  ON production_steps("Status");
CREATE INDEX IF NOT EXISTS idx_production_steps_out   ON production_steps("OutputMerchandiseId");
CREATE INDEX IF NOT EXISTS idx_production_steps_guid  ON production_steps("Guid");

-- 4. Production inputs (raw materials consumed in each step)
CREATE TABLE IF NOT EXISTS production_inputs (
    "Id"                     SERIAL       PRIMARY KEY,
    "Guid"                   UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    "ProductionStepId"       INT          NOT NULL REFERENCES production_steps("Id") ON DELETE CASCADE,
    "MerchandiseId"          INT          NOT NULL REFERENCES tbl_merchandise(id) ON DELETE RESTRICT,
    "MerchandiseRef"         VARCHAR(100),
    "MerchandiseDesignation" VARCHAR(255),
    "Unit"                   VARCHAR(50),
    "PlannedQuantity"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ActualQuantity"         DOUBLE PRECISION,
    "UnitCost"               NUMERIC(18,3),
    "TotalCost"              NUMERIC(18,3),
    "CreatedById"            INT          NOT NULL,
    "CreationDate"           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_inputs_step ON production_inputs("ProductionStepId");
CREATE INDEX IF NOT EXISTS idx_production_inputs_merc ON production_inputs("MerchandiseId");
CREATE INDEX IF NOT EXISTS idx_production_inputs_guid ON production_inputs("Guid");
