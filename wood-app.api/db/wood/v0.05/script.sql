-- Create Payments table
CREATE TABLE IF NOT EXISTS tbl_payments (
    id SERIAL NOT NULL PRIMARY KEY,
    documentid INTEGER NOT NULL,
    customerid INTEGER NOT NULL,
    paymentdate TIMESTAMP WITHOUT TIME ZONE,
    amount DECIMAL(10, 4),
    paymentmethod TEXT,
    reference TEXT,
    notes TEXT,
    createdat TIMESTAMP WITHOUT TIME ZONE,
    createdby TEXT,
    updatedat TIMESTAMP WITHOUT TIME ZONE,
    updatedbyid INTEGER,
    isdeleted BOOLEAN DEFAULT FALSE
);
	
-- Add foreign key constraints
-- tbl_payments.documentid > tbl_document.id
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_payments_tbl_document'
    )
    THEN
        ALTER TABLE tbl_payments  -- Changed from tbl_document to tbl_payments
        ADD CONSTRAINT fk_tbl_payments_tbl_document
        FOREIGN KEY (documentid) REFERENCES tbl_document (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_payments.customerid > tbl_counter_part.id
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_payments_tbl_counter_part'
    )
    THEN
        ALTER TABLE tbl_payments  -- Changed from tbl_counter_part to tbl_payments
        ADD CONSTRAINT fk_tbl_payments_tbl_counter_part
        FOREIGN KEY (customerid) REFERENCES tbl_counter_part (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_payments.updatedbyid > tbl_app_user.id
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_payments_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_payments  -- Changed from tbl_merchandise to tbl_payments
        ADD CONSTRAINT fk_tbl_payments_tbl_app_user
        FOREIGN KEY (updatedbyid) REFERENCES tbl_app_user (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS IX_Payments_DocumentId ON tbl_payments(documentid);
CREATE INDEX IF NOT EXISTS IX_Payments_CustomerId ON tbl_payments(customerid);
CREATE INDEX IF NOT EXISTS IX_Payments_PaymentDate ON tbl_payments(paymentdate);