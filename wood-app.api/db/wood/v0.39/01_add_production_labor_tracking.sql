-- Migration: v0.39 / 01_add_production_labor_tracking.sql
-- Description: Production labor tracking tables (production_step_workers, production_step_work_logs, production_other_work_entries).
-- Multi-tenant safe: iterates across all tenant schemas and public schema.
-- Strict backward compatibility: leaves production_steps.LaborCost and all existing columns untouched.

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

        -- Check if schema contains production_steps (meaning production module is provisioned)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'production_steps'
        ) THEN

            -- 1. Table: production_step_workers (Planned worker assignments to steps)
            CREATE TABLE IF NOT EXISTS production_step_workers (
                "Id"                    SERIAL       PRIMARY KEY,
                "Guid"                  UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                "ProductionStepId"      INT          NOT NULL REFERENCES production_steps("Id") ON DELETE CASCADE,
                "PersonId"              INT          NOT NULL REFERENCES tbl_person(id) ON DELETE RESTRICT,
                "EmployeeFullName"      VARCHAR(255) NOT NULL,
                "PlannedHours"          NUMERIC(18,3) NOT NULL DEFAULT 0,
                "DefaultHourlyRate"     NUMERIC(18,3) NOT NULL DEFAULT 0,
                "EstimatedLaborAmount"  NUMERIC(18,3) NOT NULL DEFAULT 0,
                "Notes"                 TEXT,
                "CreatedById"           INT          NOT NULL,
                "UpdatedById"           INT,
                "CreationDate"          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                "UpdateDate"            TIMESTAMP WITHOUT TIME ZONE
            );

            CREATE INDEX IF NOT EXISTS idx_step_workers_step ON production_step_workers("ProductionStepId");
            CREATE INDEX IF NOT EXISTS idx_step_workers_person ON production_step_workers("PersonId");
            CREATE UNIQUE INDEX IF NOT EXISTS idx_step_workers_step_person ON production_step_workers("ProductionStepId", "PersonId");
            CREATE INDEX IF NOT EXISTS idx_step_workers_guid ON production_step_workers("Guid");

            -- 2. Table: production_step_work_logs (Actual dated manufacturing work sessions)
            CREATE TABLE IF NOT EXISTS production_step_work_logs (
                "Id"                    SERIAL       PRIMARY KEY,
                "Guid"                  UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                "StepWorkerId"          INT          NOT NULL REFERENCES production_step_workers("Id") ON DELETE CASCADE,
                "ProductionStepId"      INT          NOT NULL REFERENCES production_steps("Id") ON DELETE CASCADE,
                "PersonId"              INT          NOT NULL REFERENCES tbl_person(id) ON DELETE RESTRICT,
                "EmployeeFullName"      VARCHAR(255) NOT NULL,
                "WorkDate"              DATE         NOT NULL,
                "ActualHours"           NUMERIC(18,3) NOT NULL DEFAULT 0,
                "HourlyRate"            NUMERIC(18,3) NOT NULL DEFAULT 0,
                "CalculatedLaborAmount" NUMERIC(18,3) NOT NULL DEFAULT 0,
                "Notes"                 TEXT,
                "CreatedById"           INT          NOT NULL,
                "UpdatedById"           INT,
                "CreationDate"          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                "UpdateDate"            TIMESTAMP WITHOUT TIME ZONE
            );

            CREATE INDEX IF NOT EXISTS idx_work_logs_step_worker ON production_step_work_logs("StepWorkerId");
            CREATE INDEX IF NOT EXISTS idx_work_logs_step ON production_step_work_logs("ProductionStepId");
            CREATE INDEX IF NOT EXISTS idx_work_logs_person_date ON production_step_work_logs("PersonId", "WorkDate");
            CREATE INDEX IF NOT EXISTS idx_work_logs_date ON production_step_work_logs("WorkDate");
            CREATE INDEX IF NOT EXISTS idx_work_logs_guid ON production_step_work_logs("Guid");

            -- 3. Table: production_other_work_entries (Payable work outside manufacturing orders)
            CREATE TABLE IF NOT EXISTS production_other_work_entries (
                "Id"                    SERIAL       PRIMARY KEY,
                "Guid"                  UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                "PersonId"              INT          NOT NULL REFERENCES tbl_person(id) ON DELETE RESTRICT,
                "EmployeeFullName"      VARCHAR(255) NOT NULL,
                "WorkDate"              DATE         NOT NULL,
                "Hours"                 NUMERIC(18,3) NOT NULL DEFAULT 0,
                "HourlyRate"            NUMERIC(18,3) NOT NULL DEFAULT 0,
                "CalculatedAmount"      NUMERIC(18,3) NOT NULL DEFAULT 0,
                "Description"           TEXT         NOT NULL,
                "CreatedById"           INT          NOT NULL,
                "UpdatedById"           INT,
                "CreationDate"          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                "UpdateDate"            TIMESTAMP WITHOUT TIME ZONE,
                "IsDeleted"             BOOLEAN      NOT NULL DEFAULT FALSE
            );

            CREATE INDEX IF NOT EXISTS idx_other_work_person_date ON production_other_work_entries("PersonId", "WorkDate") WHERE "IsDeleted" = FALSE;
            CREATE INDEX IF NOT EXISTS idx_other_work_date ON production_other_work_entries("WorkDate") WHERE "IsDeleted" = FALSE;
            CREATE INDEX IF NOT EXISTS idx_other_work_guid ON production_other_work_entries("Guid");

        END IF;
    END LOOP;
END $$;
