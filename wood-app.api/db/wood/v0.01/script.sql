-- ============================================================================================
-- ==================== RESPECT ORDER OF TABLE CREATIONS ==============================
-- ============================================================================================

-- Create Table Merchandise
CREATE TABLE IF NOT EXISTS tbl_merchandise (
    id SERIAL NOT NULL PRIMARY KEY,
    packagereference TEXT,
    description TEXT,
    isinvoicible BOOLEAN DEFAULT TRUE, -- Invoicible
    allownegativstock BOOLEAN DEFAULT FALSE, -- Allow negative stock
    ismergedwith BOOLEAN DEFAULT FALSE, -- Indicates if merged
    idmergedmerchandise INTEGER, -- References another merchandise if merged
    isdeleted BOOLEAN DEFAULT FALSE, -- Deleted flag
    articleid INTEGER NOT NULL, -- Foreign key reference to tbl_article
    updatedbyid INTEGER NOT NULL -- Foreign key reference to app user
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Table Document
CREATE TABLE IF NOT EXISTS tbl_document (
    id SERIAL NOT NULL PRIMARY KEY,
    type INTEGER,
    stocktransactiontype INTEGER,
    docnumber TEXT,
    description TEXT,
    supplierreference TEXT,
    isinvoiced BOOLEAN,
    creationdate TIMESTAMP WITHOUT TIME ZONE,
    updatedate TIMESTAMP WITHOUT TIME ZONE,
    withholdingtax BOOLEAN,
    totalcostpriceht DECIMAL(10, 4),
    totalcostpricettc DECIMAL(10, 4),
    totalcosttva DECIMAL(10, 4),
    totalcostdiscount DECIMAL(10, 4),
    docstatus INTEGER,
    holdingtaxid INTEGER,
    salessiteid INTEGER,
    taxeid INTEGER,
    updatedbyid INTEGER,
    counterpartid INTEGER,
    isdeleted BOOLEAN DEFAULT FALSE
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Table HoldingTax
CREATE TABLE IF NOT EXISTS tbl_holding_tax (
    id SERIAL NOT NULL PRIMARY KEY,
    description TEXT,
    taxpercentage DECIMAL(5, 2),
    taxvalue DECIMAL(10, 4),
    issigned BOOLEAN DEFAULT FALSE,
    creationdate TIMESTAMP WITHOUT TIME ZONE,
    updatedate TIMESTAMP WITHOUT TIME ZONE,
    newamountdocvalue DECIMAL (10, 4),
    updatedbyid INTEGER,
    isdeleted BOOLEAN DEFAULT FALSE
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Association Table DocumentMerchandise
CREATE TABLE IF NOT EXISTS tbl_document_merchandise (
    id SERIAL NOT NULL PRIMARY KEY,
    documentid INTEGER NOT NULL,
    merchandiseid INTEGER NOT NULL,
    creation_date TIMESTAMP NULL,
    update_date TIMESTAMP NULL,
    quantity DECIMAL(10, 4),
    unitprice_ht DECIMAL(10, 4),
    cost_ht DECIMAL(10, 4),
    discount_percentage DECIMAL(5, 2),
    cost_net_ht DECIMAL(10, 4),
    cost_discount_value DECIMAL(10, 4),
    tva_value DECIMAL(10, 4),
    cost_ttc DECIMAL(10, 4)
    
);

-- Optional: Add indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_document_merchandise_documentid ON tbl_document_merchandise (documentid);
    CREATE INDEX IF NOT EXISTS idx_document_merchandise_merchandiseid ON tbl_document_merchandise (merchandiseid);
-- Foreign key constraints
 DO
    $$
    BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
         WHERE conname = 'FK_tbl_document_merchandise_Document'
        )
        THEN
            ALTER TABLE tbl_document_merchandise
            ADD CONSTRAINT FK_tbl_document_merchandise_Document
            FOREIGN KEY (documentid) REFERENCES tbl_document (id) ON DELETE CASCADE;
        END IF;
    END
    $$;

    DO
    $$
    BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
         WHERE conname = 'FK_tbl_document_merchandise_Merchandise'
        )
        THEN
            ALTER TABLE tbl_document_merchandise
            ADD CONSTRAINT FK_tbl_document_merchandise_Merchandise
            FOREIGN KEY (merchandiseid) REFERENCES tbl_document_merchandise (id) ON DELETE CASCADE;
        END IF;
    END
    $$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Table tbl_quantity_mouvements
CREATE TABLE IF NOT EXISTS tbl_quantity_mouvements (
    id SERIAL NOT NULL PRIMARY KEY,
    lengthids TEXT,
    quantity DECIMAL(10, 4),
    creationdate TIMESTAMP,
    updatedate TIMESTAMP,
    document_merchandise_id INTEGER
    -- FOREIGN KEY (document_merchandise_id) REFERENCES tbl_merchandise (id) ON DELETE CASCADE
);

-- Optional: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quantity_movement_doc_merch ON tbl_quantity_mouvements(document_merchandise_id);

-- Add foreign key dependency if it does not already exist.
-- tbl_quantity_mouvements > tbl_document_merchandise

DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_quantity_mouvements_tbl_document_merchandise'
    )
    THEN
        ALTER TABLE tbl_quantity_mouvements
        ADD CONSTRAINT fk_tbl_quantity_mouvements_tbl_document_merchandise
        FOREIGN KEY (document_merchandise_id) REFERENCES tbl_document_merchandise (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Create Table ListOfLength
CREATE TABLE IF NOT EXISTS tbl_list_of_lengths (
    id SERIAL NOT NULL PRIMARY KEY,
    numberofpieces INTEGER,
    quantity DECIMAL(10, 4),
    lengthappvarid INTEGER,
    quantitymouvementid INTEGER NOT NULL
    --FOREIGN KEY (lengthappvarid) REFERENCES tbl_appvariable (id) ON DELETE SET NULL,
    --FOREIGN KEY (quantitymouvementid) REFERENCES tbl_quantity_mouvements (id) ON DELETE CASCADE
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Add foreign key dependency if it does not already exist.
-- tbl_list_of_lengths > tbl_appvariable
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_list_of_lengths_tbl_appvariable'
    )
    THEN
        ALTER TABLE tbl_list_of_lengths
        ADD CONSTRAINT fk_tbl_list_of_lengths_tbl_appvariable
        FOREIGN KEY (lengthappvarid) REFERENCES tbl_appvariable (id) ON DELETE SET NULL;
    END IF;
END
$$;


-- tbl_list_of_lengths > tbl_quantity_mouvements
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_list_of_lengths_tbl_quantity_mouvements'
    )
    THEN
        ALTER TABLE tbl_list_of_lengths
        ADD CONSTRAINT fk_tbl_list_of_lengths_tbl_quantity_mouvements
        FOREIGN KEY (quantitymouvementid) REFERENCES tbl_quantity_mouvements (id) ON DELETE SET NULL;
    END IF;
END
$$;


-- Add foreign key dependency if it does not already exist.
-- tbl_merchandise > tbl_app_user
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_merchandise_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_merchandise
        ADD CONSTRAINT fk_tbl_merchandise_tbl_app_user
        FOREIGN KEY (updatedbyid) REFERENCES tbl_app_user (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_merchandise > tbl_article
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_merchandise_tbl_article'
    )
    THEN
        ALTER TABLE tbl_merchandise
        ADD CONSTRAINT fk_tbl_merchandise_tbl_article
        FOREIGN KEY (articleid) REFERENCES tbl_article (id) ON DELETE RESTRICT;
    END IF;
END
$$;

---- tbl_merchandise > tbl_merchandise
--DO
--$$
--BEGIN
--    IF NOT EXISTS (
--        SELECT 1
--        FROM pg_constraint
--        WHERE conname = 'fk_tbl_merchandise_tbl_merchandise'
--    )
--    THEN
--        ALTER TABLE tbl_merchandise
--        ADD CONSTRAINT fk_tbl_merchandise_tbl_merchandise
--        FOREIGN KEY (idmergedmerchandise) REFERENCES tbl_merchandise (id) ON DELETE SET NULL;
--    END IF;
--END
--$$;

-- tbl_document > tbl_app_user
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_document_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_document
        ADD CONSTRAINT fk_tbl_document_tbl_app_user
        FOREIGN KEY (updatedbyid) REFERENCES tbl_app_user (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_document > tbl_sales_sites
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_document_tbl_sales_sites'
    )
    THEN
        ALTER TABLE tbl_document
        ADD CONSTRAINT fk_tbl_document_tbl_sales_sites
        FOREIGN KEY (salessiteid) REFERENCES tbl_sales_sites (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- tbl_document > tbl_appvariable
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_document_tbl_appvariable'
    )
    THEN
        ALTER TABLE tbl_document
        ADD CONSTRAINT fk_tbl_document_tbl_appvariable
        FOREIGN KEY (taxeid) REFERENCES tbl_appvariable (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- tbl_document > tbl_holding_tax
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_document_tbl_holding_tax'
    )
    THEN
        ALTER TABLE tbl_document
        ADD CONSTRAINT fk_tbl_document_tbl_holding_tax
        FOREIGN KEY (holdingtaxid) REFERENCES tbl_holding_tax (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- tbl_list_of_lengths > tbl_appvariable
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tbl_list_of_lengths_tbl_appvariable'
    )
    THEN
        ALTER TABLE tbl_list_of_lengths
        ADD CONSTRAINT tbl_list_of_lengths_tbl_appvariable
        FOREIGN KEY (lengthid) REFERENCES tbl_appvariable (id) ON DELETE SET NULL;
    END IF;
END
$$;


-- tbl_list_of_lengths > tbl_quantity_mouvements
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tbl_list_of_lengths_tbl_quantity_mouvements'
    )
    THEN
        ALTER TABLE tbl_list_of_lengths
        ADD CONSTRAINT tbl_list_of_lengths_tbl_quantity_mouvements
        FOREIGN KEY (quantitymouvementid) REFERENCES tbl_quantity_mouvements (id) ON DELETE CASCADE;
    END IF;
END
$$;




-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Add foreign key dependency if it does not already exist.
-- tbl_holding_tax > tbl_app_user
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_holding_tax_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_holding_tax
        ADD CONSTRAINT fk_tbl_holding_tax_tbl_app_user
        FOREIGN KEY (updatedbyid) REFERENCES tbl_app_user (id) ON DELETE RESTRICT;
    END IF;
END
$$;


-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Association Table DocumentDocumentRelationship
CREATE TABLE IF NOT EXISTS tbl_document_document_relationship (
    parent_document_id INT NOT NULL,
    child_document_id INT NOT NULL,
    PRIMARY KEY (parent_document_id, child_document_id),
    FOREIGN KEY (parent_document_id) REFERENCES tbl_document (id) ON DELETE CASCADE,
    FOREIGN KEY (child_document_id) REFERENCES tbl_document (id) ON DELETE CASCADE
);

-- Optional: Add indexes for better performance
CREATE INDEX idx_parent_document_id ON tbl_document_document_relationship (parent_document_id);
CREATE INDEX idx_child_document_id ON tbl_document_document_relationship (child_document_id);