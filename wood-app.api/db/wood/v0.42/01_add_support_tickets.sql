-- Migration: v0.42 / 01_add_support_tickets.sql
-- Description: Adds tbl_support_tickets across all tenant schemas and public schema.
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
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.tbl_support_tickets (
                "Id" SERIAL PRIMARY KEY,
                "TicketReference" VARCHAR(50) NOT NULL,
                "UserId" INT NOT NULL,
                "UserFullName" VARCHAR(150) NOT NULL,
                "UserEmail" VARCHAR(150) NOT NULL,
                "EnterpriseName" VARCHAR(200) NOT NULL,
                "TenantSlug" VARCHAR(100) NOT NULL,
                "Category" VARCHAR(100) NOT NULL,
                "Subcategory" VARCHAR(150) NOT NULL,
                "Priority" VARCHAR(50) NOT NULL DEFAULT ''Normale'',
                "Subject" VARCHAR(255) NOT NULL,
                "Description" TEXT NOT NULL,
                "CurrentRoute" VARCHAR(255),
                "AppVersion" VARCHAR(50),
                "ContextData" TEXT,
                "AttachmentFileName" VARCHAR(255),
                "AttachmentContentType" VARCHAR(100),
                "AttachmentStoragePath" VARCHAR(500),
                "AttachmentSizeBytes" BIGINT,
                "IdempotencyKey" VARCHAR(100),
                "EmailStatus" INT NOT NULL DEFAULT 0,
                "EmailError" VARCHAR(1000),
                "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_tbl_support_tickets_reference
            ON %I.tbl_support_tickets ("TicketReference");

            CREATE INDEX IF NOT EXISTS idx_tbl_support_tickets_tenant_user
            ON %I.tbl_support_tickets ("TenantSlug", "UserId", "CreatedAt");

            CREATE INDEX IF NOT EXISTS idx_tbl_support_tickets_idempotency
            ON %I.tbl_support_tickets ("IdempotencyKey");
        ', r.schema_name, r.schema_name, r.schema_name, r.schema_name);
    END LOOP;
END $$;
