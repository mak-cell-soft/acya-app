-- Create Table Transporter
CREATE TABLE IF NOT EXISTS tbl_transporter (
    id SERIAL NOT NULL PRIMARY KEY,
    firstname TEXT,
    lastname TEXT,
    fullname TEXT,
    vehicleid INTEGER
);

-- Create Table Vehicle
CREATE TABLE IF NOT EXISTS tbl_vehicle (
    id SERIAL NOT NULL PRIMARY KEY,
    serialnumber TEXT,
    brand TEXT,
    insurancedate TIMESTAMP,
    technicalvisitdate TIMESTAMP,
    mileage TEXT,
    draining TEXT,
    drainingdate TIMESTAMP
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Add foreign key dependency if it does not already exist.
-- tbl_transporter > tbl_vehicle
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_transporter_tbl_vehicle'
    )
    THEN
        ALTER TABLE tbl_transporter
        ADD CONSTRAINT fk_tbl_transporter_tbl_vehicle
        FOREIGN KEY (vehicleid) REFERENCES tbl_vehicle (id) ON DELETE CASCADE;
    END IF;
END
$$;

-- tbl_counterpart > tbl_transporter
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_counter_part_tbl_transporter'
    )
    THEN
        ALTER TABLE tbl_counter_part
        ADD CONSTRAINT fk_tbl_counter_part_tbl_transporter
        FOREIGN KEY (transporterid) REFERENCES tbl_transporter (id) ON DELETE SET NULL;
    END IF;
END
$$;



-- =============================================================================
-- ====================== Transfer Stock Tables ================================
-- =============================================================================
-- Create Table StockTransfer
CREATE TABLE IF NOT EXISTS tbl_stock_transfer (
    id SERIAL NOT NULL PRIMARY KEY,
    exitdocumentid INTEGER NOT NULL, -- Foreign key to exit document
    receiptdocumentid INTEGER NOT NULL, -- Foreign key to receipt document
    transferdate TIMESTAMP NOT NULL, -- When transfer occurred
    reference TEXT, -- Optional reference number
    status INTEGER NOT NULL DEFAULT 1, -- Pending by default = 1
    confirmedbyid INTEGER,
    confirmationdate TIMESTAMP,
    rejectionreason TEXT,
    notes TEXT, -- Additional notes
    transporterid INTEGER, -- Optional transporter
    createdbyid INTEGER NOT NULL, -- Who created the transfer
    creationdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When record was created
);

-- Add foreign key constraints
-- tbl_stock_transfer > tbl_document (exit document)
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_transfer_exit_document'
    )
    THEN
        ALTER TABLE tbl_stock_transfer
        ADD CONSTRAINT fk_tbl_stock_transfer_exit_document
        FOREIGN KEY (exitdocumentid) REFERENCES tbl_document (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_stock_transfer > tbl_document (receipt document)
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_transfer_receipt_document'
    )
    THEN
        ALTER TABLE tbl_stock_transfer
        ADD CONSTRAINT fk_tbl_stock_transfer_receipt_document
        FOREIGN KEY (receiptdocumentid) REFERENCES tbl_document (id) ON DELETE RESTRICT;
    END IF;
END
$$;

-- tbl_stock_transfer > tbl_transporter (optional)
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_transfer_transporter'
    ) AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tbl_transporter')
    THEN
        ALTER TABLE tbl_stock_transfer
        ADD CONSTRAINT fk_tbl_stock_transfer_transporter
        FOREIGN KEY (transporterid) REFERENCES tbl_transporter (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- tbl_stock_transfer > tbl_app_user (created by)
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_transfer_created_by'
    )
    THEN
        ALTER TABLE tbl_stock_transfer
        ADD CONSTRAINT fk_tbl_stock_transfer_created_by
        FOREIGN KEY (createdbyid) REFERENCES tbl_app_user (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- tbl_stock_transfer > tbl_app_user (confirmed by)
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_stock_transfer_confirmedby'
    )
    THEN
        ALTER TABLE tbl_stock_transfer
        ADD CONSTRAINT fk_tbl_stock_transfer_confirmedby
        FOREIGN KEY (confirmedbyid) REFERENCES tbl_app_user (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Add unique constraint to prevent duplicate document references
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_tbl_stock_transfer_documents'
    )
    THEN
        ALTER TABLE tbl_stock_transfer
        ADD CONSTRAINT uq_tbl_stock_transfer_documents
        UNIQUE (exitdocumentid, receiptdocumentid);
    END IF;
END
$$;




-- =============================================================================
-- ====================== Pending Notification Tables ==========================
-- =============================================================================

CREATE TABLE IF NOT EXISTS tbl_pending_notification (
    id SERIAL NOT NULL PRIMARY KEY,
    content TEXT NOT NULL,
    targetgroup TEXT NOT NULL,
    status INTEGER NOT NULL,
    retry_count INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_attempt_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    error_message TEXT NULL
);

CREATE INDEX ix_tbl_pending_notification_targetgroup_status ON tbl_pending_notification (targetgroup, status);