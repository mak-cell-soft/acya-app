-- Migration: Add Payslip Management
-- Description: Create table for employee monthly payslips.

CREATE TABLE IF NOT EXISTS tbl_employee_payslips (
    id SERIAL PRIMARY KEY,
    employeeid INTEGER NOT NULL REFERENCES tbl_person(id) ON DELETE CASCADE,
    periodmonth INTEGER NOT NULL,
    periodyear INTEGER NOT NULL,
    basesalary NUMERIC(19, 4) NOT NULL DEFAULT 0,
    bonuses NUMERIC(19, 4) DEFAULT 0,
    deductions NUMERIC(19, 4) DEFAULT 0,
    netsalary NUMERIC(19, 4) NOT NULL DEFAULT 0,
    generatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_employee_payslips_employee ON tbl_employee_payslips(employeeid);
CREATE INDEX IF NOT EXISTS idx_employee_payslips_period ON tbl_employee_payslips(periodyear, periodmonth);

COMMENT ON TABLE tbl_employee_payslips IS 'History of generated monthly payslips per employee.';
