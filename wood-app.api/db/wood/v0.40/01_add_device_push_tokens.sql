-- Migration: v0.40 / 01_add_device_push_tokens.sql
-- Description: Device Push Tokens table for FCM mobile push notifications.
-- Multi-tenant safe: iterates across all tenant schemas and public schema containing tbl_app_user.
-- EF Core Migration alignment: 20261017170000_AddDevicePushTokens
-- Integrity hardened: validates complete schema (columns, types, nullability, PK, FK with CASCADE, indexes)
--                      before synchronizing __EFMigrationsHistory.

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

        -- Only apply to schemas that contain tbl_app_user (tenant schemas and single-tenant public)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_app_user'
        ) THEN

            -- 1. Table Creation (Idempotent for absent table)
            CREATE TABLE IF NOT EXISTS "DevicePushTokens" (
                "Id"            SERIAL PRIMARY KEY,
                "UserId"        INT NOT NULL REFERENCES tbl_app_user(id) ON DELETE CASCADE,
                "Token"         VARCHAR(512) NOT NULL,
                "Platform"      VARCHAR(30) NOT NULL,
                "AppVersion"    VARCHAR(50),
                "IsActive"      BOOLEAN NOT NULL DEFAULT TRUE,
                "CreatedAt"     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                "LastActiveAt"  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- 2. Indexes Creation (Idempotent for absent indexes)
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_DevicePushTokens_Token"
            ON "DevicePushTokens" ("Token");

            CREATE INDEX IF NOT EXISTS "IX_DevicePushTokens_UserId_IsActive"
            ON "DevicePushTokens" ("UserId", "IsActive");

            -- 3. Schema Integrity Validation (Prevents falsely marking incomplete existing tables as migrated)
            
            -- Validation 3.1: Verify all 8 columns exist with exact data types and nullability
            IF (
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_schema = r.schema_name 
                  AND table_name = 'DevicePushTokens'
                  AND (
                    (column_name = 'Id' AND data_type = 'integer' AND is_nullable = 'NO') OR
                    (column_name = 'UserId' AND data_type = 'integer' AND is_nullable = 'NO') OR
                    (column_name = 'Token' AND data_type = 'character varying' AND character_maximum_length = 512 AND is_nullable = 'NO') OR
                    (column_name = 'Platform' AND data_type = 'character varying' AND character_maximum_length = 30 AND is_nullable = 'NO') OR
                    (column_name = 'AppVersion' AND data_type = 'character varying' AND character_maximum_length = 50 AND is_nullable = 'YES') OR
                    (column_name = 'IsActive' AND data_type = 'boolean' AND is_nullable = 'NO') OR
                    (column_name = 'CreatedAt' AND data_type = 'timestamp without time zone' AND is_nullable = 'NO') OR
                    (column_name = 'LastActiveAt' AND data_type = 'timestamp without time zone' AND is_nullable = 'NO')
                  )
            ) <> 8 THEN
                RAISE EXCEPTION 'Schema integrity validation failed in schema %: DevicePushTokens columns, types, or nullability do not match expected EF Core schema.', r.schema_name;
            END IF;

            -- Validation 3.2: Verify primary key constraint on "Id"
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema = r.schema_name
                  AND tc.table_name = 'DevicePushTokens'
                  AND tc.constraint_type = 'PRIMARY KEY'
                  AND kcu.column_name = 'Id'
            ) THEN
                RAISE EXCEPTION 'Schema integrity validation failed in schema %: DevicePushTokens is missing primary key constraint on "Id".', r.schema_name;
            END IF;

            -- Validation 3.3: Verify foreign key on "UserId" referencing tbl_app_user(id) with ON DELETE CASCADE
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                JOIN information_schema.referential_constraints rc
                  ON tc.constraint_name = rc.constraint_name
                 AND tc.table_schema = rc.constraint_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON rc.unique_constraint_name = ccu.constraint_name
                 AND rc.unique_constraint_schema = ccu.constraint_schema
                WHERE tc.table_schema = r.schema_name
                  AND tc.table_name = 'DevicePushTokens'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'UserId'
                  AND ccu.table_schema = r.schema_name
                  AND ccu.table_name = 'tbl_app_user'
                  AND ccu.column_name = 'id'
                  AND rc.delete_rule = 'CASCADE'
            ) THEN
                RAISE EXCEPTION 'Schema integrity validation failed in schema %: DevicePushTokens is missing foreign key on "UserId" -> tbl_app_user(id) ON DELETE CASCADE.', r.schema_name;
            END IF;

            -- Validation 3.4: Verify unique index on "Token"
            IF NOT EXISTS (
                SELECT 1 
                FROM pg_catalog.pg_indexes 
                WHERE schemaname = r.schema_name 
                  AND tablename = 'DevicePushTokens' 
                  AND indexdef LIKE '%UNIQUE%("Token")%'
            ) THEN
                RAISE EXCEPTION 'Schema integrity validation failed in schema %: DevicePushTokens is missing unique index on "Token".', r.schema_name;
            END IF;

            -- Validation 3.5: Verify composite index on ("UserId", "IsActive")
            IF NOT EXISTS (
                SELECT 1 
                FROM pg_catalog.pg_indexes 
                WHERE schemaname = r.schema_name 
                  AND tablename = 'DevicePushTokens' 
                  AND indexdef LIKE '%("UserId", "IsActive")%'
            ) THEN
                RAISE EXCEPTION 'Schema integrity validation failed in schema %: DevicePushTokens is missing composite index on ("UserId", "IsActive").', r.schema_name;
            END IF;

            -- 4. EF Core Migration History Synchronization
            -- Recorded ONLY after all schema integrity validations succeed.
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId"    VARCHAR(150) NOT NULL PRIMARY KEY,
                "ProductVersion" VARCHAR(32) NOT NULL
            );

            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES ('20261017170000_AddDevicePushTokens', '7.0.20')
            ON CONFLICT ("MigrationId") DO NOTHING;

        END IF;
    END LOOP;
END $$;
