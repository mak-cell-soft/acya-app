-- Consolidated Migration for Employee Management Features
-- Includes: Leave Management, Payslips, and Advance Management

-- 1. Leave Management
CREATE TABLE IF NOT EXISTS tbl_employee_leaves (
    id SERIAL PRIMARY KEY,
    employeeid INTEGER NOT NULL REFERENCES tbl_person(id) ON DELETE CASCADE,
    leavetype VARCHAR(100) NOT NULL,
    startdate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    enddate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    durationdays NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- 2. Payslip Management
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

-- 3. Advance Management
CREATE TABLE IF NOT EXISTS tbl_employee_advances (
    id SERIAL PRIMARY KEY,
    employeeid INTEGER NOT NULL REFERENCES tbl_person(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    requestdate TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    repaymentschedule TEXT,
    amountrepaid NUMERIC(19, 4) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_employee_leaves_employee ON tbl_employee_leaves(employeeid);
CREATE INDEX IF NOT EXISTS idx_employee_payslips_employee ON tbl_employee_payslips(employeeid);
CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON tbl_employee_advances(employeeid);
