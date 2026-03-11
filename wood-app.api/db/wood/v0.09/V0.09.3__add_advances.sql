-- Migration: Add Advance Management
-- Description: Create table for salary advance requests and repayment tracking.

CREATE TABLE IF NOT EXISTS tbl_employee_advances (
    id SERIAL PRIMARY KEY,
    employeeid INTEGER NOT NULL REFERENCES tbl_person(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    requestdate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    repaymentschedule TEXT, -- JSON or description of repayment plan
    amountrepaid NUMERIC(19, 4) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON tbl_employee_advances(employeeid);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON tbl_employee_advances(status);

COMMENT ON TABLE tbl_employee_advances IS 'Tracks salary advance requests and their repayment status.';
