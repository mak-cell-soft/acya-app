-- Migration to fix Enum columns in tbl_document
-- This converts column types from TEXT to INTEGER to match C# Enums
-- and resolve data retrieval issues in Entity Framework Core.

DO $$
BEGIN
    -- 1. Fix 'type' column
    BEGIN
        ALTER TABLE tbl_document 
        ALTER COLUMN type TYPE INTEGER USING (TRIM(type::text)::integer);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert type column. It may already be INTEGER or contains non-numeric data.';
    END;

    -- 2. Fix 'stocktransactiontype' column
    BEGIN
        ALTER TABLE tbl_document 
        ALTER COLUMN stocktransactiontype TYPE INTEGER USING (TRIM(stocktransactiontype::text)::integer);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert stocktransactiontype column.';
    END;

    -- 3. Fix 'docstatus' column
    BEGIN
        ALTER TABLE tbl_document 
        ALTER COLUMN docstatus TYPE INTEGER USING (TRIM(docstatus::text)::integer);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert docstatus column.';
    END;

    -- 4. Fix 'billingstatus' column
    BEGIN
        ALTER TABLE tbl_document 
        ALTER COLUMN billingstatus TYPE INTEGER USING (TRIM(billingstatus::text)::integer);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert billingstatus column.';
    END;
END $$;
