-- Migration: v0.36 / 01_sync_production_and_search_indexes.sql
-- Description: Ensure ismanagingproduction on tbl_enterprise, production module tables, and search indexes across all tenant schemas.
-- Multi-tenant safe: iterates across all tenant schemas and public schema.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    ) LOOP
        EXECUTE format('SET search_path TO %I, public;', r.schema_name);

        -- 1. Ensure ismanagingproduction on tbl_enterprise
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_enterprise'
        ) THEN
            ALTER TABLE tbl_enterprise 
            ADD COLUMN IF NOT EXISTS ismanagingproduction BOOLEAN DEFAULT FALSE;
        END IF;

        -- 2. Ensure purchase search indexes on tbl_document & tbl_document_merchandise
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_document'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_tbl_document_type_deleted_date 
            ON tbl_document (type, isdeleted, creationdate DESC);

            CREATE INDEX IF NOT EXISTS idx_tbl_document_counterpartid 
            ON tbl_document (counterpartid) 
            WHERE isdeleted = false;

            CREATE INDEX IF NOT EXISTS idx_tbl_document_docnumber_lower 
            ON tbl_document (LOWER(docnumber)) 
            WHERE isdeleted = false;

            CREATE INDEX IF NOT EXISTS idx_tbl_document_supplierreference_lower 
            ON tbl_document (LOWER(supplierreference)) 
            WHERE isdeleted = false AND supplierreference IS NOT NULL;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_document_merchandise'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_tbl_doc_merch_doc_merch_type 
            ON tbl_document_merchandise (documentid, line_type, merchandiseid);
        END IF;

        -- 3. Ensure production tables
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_sales_sites'
        ) THEN
            CREATE TABLE IF NOT EXISTS production_orders (
                "Id"                     SERIAL       PRIMARY KEY,
                "Guid"                   UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                "Reference"              VARCHAR(50)  NOT NULL,
                "Description"            TEXT,
                "Notes"                  TEXT,
                "SalesSiteId"            INT          NOT NULL REFERENCES tbl_sales_sites(id) ON DELETE RESTRICT,
                "Status"                 SMALLINT     NOT NULL DEFAULT 0,
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

            CREATE TABLE IF NOT EXISTS production_steps (
                "Id"                     SERIAL       PRIMARY KEY,
                "Guid"                   UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                "ProductionOrderId"      INT          NOT NULL REFERENCES production_orders("Id") ON DELETE CASCADE,
                "StepNumber"             INT          NOT NULL DEFAULT 1,
                "Name"                   VARCHAR(255) NOT NULL,
                "Description"            TEXT,
                "Status"                 SMALLINT     NOT NULL DEFAULT 0,
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
        END IF;
    END LOOP;
END $$;
