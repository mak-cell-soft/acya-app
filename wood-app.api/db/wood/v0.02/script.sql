-- Create Table Stock
CREATE TABLE IF NOT EXISTS tbl_stock (
    id SERIAL NOT NULL PRIMARY KEY,
    type INTEGER,
    quantity DECIMAL(10, 4),
    creationdate TIMESTAMP,
    updatedate TIMESTAMP,
    idmerchandise INTEGER,
    idsite INTEGER,
    updatedbyid INTEGER
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Add foreign key dependency if it does not already exist.
-- tbl_stock > tbl_app_user
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_stock
        ADD CONSTRAINT fk_tbl_stock_tbl_app_user
        FOREIGN KEY (updatedbyid) REFERENCES tbl_app_user (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_stock > tbl_merchandise
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_tbl_merchandise'
    )
    THEN
        ALTER TABLE tbl_stock
        ADD CONSTRAINT fk_tbl_stock_tbl_merchandise
        FOREIGN KEY (idmerchandise) REFERENCES tbl_merchandise (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_stock > tbl_sales_sites
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_tbl_sales_sites'
    )
    THEN
        ALTER TABLE tbl_stock
        ADD CONSTRAINT fk_tbl_stock_tbl_sales_sites
        FOREIGN KEY (idsite) REFERENCES tbl_sales_sites (id) ON DELETE RESTRICT;
    END IF;
END
$$;
