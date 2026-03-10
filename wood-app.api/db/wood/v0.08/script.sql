/* 
   Version: v0.008
   Purpose: Implement Account Balance Management (Solde) 
*/

-- 1. Add OpeningBalance to tbl_counter_part
-- This stores the historical starting balance for a customer/supplier.
ALTER TABLE tbl_counter_part 
ADD COLUMN openingbalance NUMERIC(18, 2) DEFAULT 0;

-- 2. Modify tbl_payments to support Advance Payments
-- Making DocumentId nullable allows recording a payment before an invoice is created.
ALTER TABLE tbl_payments 
ALTER COLUMN documentid DROP NOT NULL;

-- 3. Create tbl_account_ledger
-- This table acts as a journal tracking all financial movements for audit and balance calculation.
CREATE TABLE tbl_account_ledger (
    id SERIAL PRIMARY KEY,
    counterpartid INTEGER NOT NULL REFERENCES tbl_counter_part(id),
    transactiondate TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    type VARCHAR(50) NOT NULL, -- 'OpeningBalance', 'Invoice', 'Payment', 'Adjustment', 'CreditNote', 'Return'
    relatedid INTEGER, -- References tbl_document.id or tbl_payments.id
    debit NUMERIC(18, 2) DEFAULT 0, -- Increase in Customer debt / Decrease in Supplier debt
    credit NUMERIC(18, 2) DEFAULT 0, -- Decrease in Customer debt / Increase in Supplier debt
    description TEXT,
    createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- Index for performance on filtering by counterpart and date
CREATE INDEX idx_ledger_counterpart_date ON tbl_account_ledger(counterpartid, transactiondate);

COMMENT ON COLUMN tbl_account_ledger.type IS 'Type of transaction: OpeningBalance, Invoice, Payment, Adjustment, etc.';
COMMENT ON COLUMN tbl_account_ledger.debit IS 'Debit increases Customer balance or decreases Supplier balance.';
COMMENT ON COLUMN tbl_account_ledger.credit IS 'Credit decreases Customer balance or increases Supplier balance.';


-- 1. Update Precision for balances and variables
ALTER TABLE tbl_appvariable ALTER COLUMN "value" TYPE numeric(19, 4);

-- 2. Update Precision for document totals (to avoid similar errors)
ALTER TABLE tbl_document ALTER COLUMN totalcostpriceht TYPE numeric(19, 4);
ALTER TABLE tbl_document ALTER COLUMN totalcostpricettc TYPE numeric(19, 4);
ALTER TABLE tbl_document ALTER COLUMN totalcosttva TYPE numeric(19, 4);
ALTER TABLE tbl_document ALTER COLUMN totalcostdiscount TYPE numeric(19, 4);

-- 3. Update Precision for merchandise item costs
ALTER TABLE tbl_document_merchandise ALTER COLUMN unitprice_ht TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN cost_ht TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN cost_net_ht TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN cost_ttc TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN tva_value TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN cost_discount_value TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN quantity TYPE numeric(19, 4);
ALTER TABLE tbl_document_merchandise ALTER COLUMN discount_percentage TYPE numeric(5, 2);

-- Stock (Optional but recommended for consistency)
ALTER TABLE tbl_stock ALTER COLUMN quantity TYPE numeric(19, 4);
ALTER TABLE tbl_quantity_mouvements ALTER COLUMN quantity TYPE numeric(19, 4);
ALTER TABLE tbl_list_of_lengths ALTER COLUMN quantity TYPE numeric(19, 4);

-- Link this database state to Entity Framework
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260310162842_InitialMigration', '7.0.20')
ON CONFLICT ("MigrationId") DO NOTHING;