-- Migration: v0.33 / 01_chantier_stabilization.sql
-- Description: Chantier Stabilization: Add ArticleId to material requirements and consumptions, make MerchandiseId nullable, and ensure Client CounterPart linkage.
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
        -- 1. Ensure ClientCounterPartId column on chantier_projects
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'chantier_projects'
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.chantier_projects 
                ADD COLUMN IF NOT EXISTS "ClientCounterPartId" INT;
            ', r.schema_name);
        END IF;

        -- 2. Material requirements: Add ArticleId, make MerchandiseId nullable
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'chantier_material_requirements'
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.chantier_material_requirements 
                ADD COLUMN IF NOT EXISTS "ArticleId" INT REFERENCES %I.tbl_article(id) ON DELETE RESTRICT;
            ', r.schema_name, r.schema_name);

            EXECUTE format('
                ALTER TABLE %I.chantier_material_requirements 
                ALTER COLUMN "MerchandiseId" DROP NOT NULL;
            ', r.schema_name);

            -- Backfill ArticleId from Merchandise if any row had MerchandiseId populated
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = r.schema_name AND table_name = 'tbl_merchandise'
            ) THEN
                EXECUTE format('
                    UPDATE %I.chantier_material_requirements r
                    SET "ArticleId" = m.articleid
                    FROM %I.tbl_merchandise m
                    WHERE r."MerchandiseId" = m.id AND r."ArticleId" IS NULL;
                ', r.schema_name, r.schema_name);
            END IF;

            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_chantier_matreq_aid ON %I.chantier_material_requirements("ArticleId");
            ', r.schema_name);
        END IF;

        -- 3. Material consumptions: Add ArticleId, make MerchandiseId nullable
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'chantier_material_consumptions'
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.chantier_material_consumptions 
                ADD COLUMN IF NOT EXISTS "ArticleId" INT REFERENCES %I.tbl_article(id) ON DELETE SET NULL;
            ', r.schema_name, r.schema_name);

            EXECUTE format('
                ALTER TABLE %I.chantier_material_consumptions 
                ALTER COLUMN "MerchandiseId" DROP NOT NULL;
            ', r.schema_name);

            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = r.schema_name AND table_name = 'tbl_merchandise'
            ) THEN
                EXECUTE format('
                    UPDATE %I.chantier_material_consumptions c
                    SET "ArticleId" = m.articleid
                    FROM %I.tbl_merchandise m
                    WHERE c."MerchandiseId" = m.id AND c."ArticleId" IS NULL;
                ', r.schema_name, r.schema_name);
            END IF;

            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_chantier_consumption_aid ON %I.chantier_material_consumptions("ArticleId");
            ', r.schema_name);
        END IF;
    END LOOP;
END $$;
