-- V0.27: Indexes for Deep Search / Advanced Search on Purchase Documents
-- Optimizes queries filtering by document type, creation date, supplier, references, and merchandise lines

-- 1. Index for multi-column document filtering (Type, IsDeleted, CreationDate)
CREATE INDEX IF NOT EXISTS idx_tbl_document_type_deleted_date 
ON tbl_document (type, isdeleted, creationdate DESC);

-- 2. Index for counterpart / supplier filtering
CREATE INDEX IF NOT EXISTS idx_tbl_document_counterpartid 
ON tbl_document (counterpartid) 
WHERE isdeleted = false;

-- 3. Case-insensitive pattern matching indexes for document reference and supplier reference
CREATE INDEX IF NOT EXISTS idx_tbl_document_docnumber_lower 
ON tbl_document (LOWER(docnumber)) 
WHERE isdeleted = false;

CREATE INDEX IF NOT EXISTS idx_tbl_document_supplierreference_lower 
ON tbl_document (LOWER(supplierreference)) 
WHERE isdeleted = false AND supplierreference IS NOT NULL;

-- 4. Line-level index on tbl_document_merchandise to accelerate EXISTS subqueries
CREATE INDEX IF NOT EXISTS idx_tbl_doc_merch_doc_merch_type 
ON tbl_document_merchandise (documentid, line_type, merchandiseid);
