-- Migration: Add Leave Management
-- Description: Create table for employee leave requests and balance tracking.

CREATE TABLE IF NOT EXISTS tbl_employee_leaves (
    id SERIAL PRIMARY KEY,
    employeeid INTEGER NOT NULL REFERENCES tbl_person(id) ON DELETE CASCADE,
    leavetype VARCHAR(100) NOT NULL, -- e.g., 'Paid', 'Sick', 'Unpaid'
    startdate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    enddate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    durationdays NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_employee_leaves_employee ON tbl_employee_leaves(employeeid);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_status ON tbl_employee_leaves(status);

COMMENT ON TABLE tbl_employee_leaves IS 'Tracks employee leave requests and their status.';
