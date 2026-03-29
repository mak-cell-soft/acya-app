-- Fix for 500 Internal Server Error during Document PUT/Update
-- Correcting broken foreign key reference in tbl_document_merchandise
ALTER TABLE tbl_document_merchandise DROP CONSTRAINT IF EXISTS fk_tbl_document_merchandise_merchandise;
ALTER TABLE tbl_document_merchandise ADD CONSTRAINT fk_tbl_document_merchandise_merchandise 
    FOREIGN KEY (merchandiseid) REFERENCES tbl_merchandise(id) ON DELETE CASCADE;

-- Fixing QuantityMovements foreign key to enable CASCADE delete (was SET NULL)
ALTER TABLE tbl_quantity_mouvements DROP CONSTRAINT IF EXISTS fk_tbl_quantity_mouvements_tbl_document_merchandise;
ALTER TABLE tbl_quantity_mouvements ADD CONSTRAINT fk_tbl_quantity_mouvements_tbl_document_merchandise 
    FOREIGN KEY (document_merchandise_id) REFERENCES tbl_document_merchandise(id) ON DELETE CASCADE;

-- Cleaning up redundant/conflicting constraints on ListOfLengths
ALTER TABLE tbl_list_of_lengths DROP CONSTRAINT IF EXISTS fk_tbl_list_of_lengths_tbl_quantity_mouvements;
ALTER TABLE tbl_list_of_lengths DROP CONSTRAINT IF EXISTS fk_tbl_list_of_lengths_tbl_appvariable;
