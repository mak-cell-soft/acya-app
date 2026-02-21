-- Migration to add confirmation code column
-- This adds confirmation code column to tbl_stock_transfer table
-- This adds isservice column to tbl_document table

DO $$
BEGIN
    -- 1. Add confirmation code column
    BEGIN
        ALTER TABLE tbl_stock_transfer 
        ADD COLUMN confirmationcode TEXT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add confirmation code column.';
    END;

    -- 2. Add isservice column in tbl_document table
    BEGIN
        ALTER TABLE tbl_document 
        ADD COLUMN isservice BOOLEAN default false;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add isservice column.';
    END;
END $$;