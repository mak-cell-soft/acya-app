-- Migration to add confirmation code column
-- This adds confirmation code column to tbl_stock_transfer table

DO $$
BEGIN
    -- 1. Add confirmation code column
    BEGIN
        ALTER TABLE tbl_stock_transfer 
        ADD COLUMN confirmationcode TEXT;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add confirmation code column.';
    END;
END $$;