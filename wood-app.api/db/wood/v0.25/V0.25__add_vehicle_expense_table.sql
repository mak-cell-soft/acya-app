-- V0.25: Create table tbl_vehicle_expense for tracking fuel, maintenance, and vehicle operational logs
CREATE TABLE IF NOT EXISTS tbl_vehicle_expense (
    id SERIAL PRIMARY KEY,
    vehicleid INTEGER NOT NULL,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    type VARCHAR(50) NOT NULL,
    mileage NUMERIC(18, 2) NULL,
    liters NUMERIC(18, 2) NULL,
    amount NUMERIC(18, 3) NOT NULL,
    drivername VARCHAR(255) NULL,
    stationorprovider VARCHAR(255) NULL,
    notes TEXT NULL,
    createdat TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    createdby VARCHAR(255) NULL,
    CONSTRAINT fk_tbl_vehicle_expense_vehicle FOREIGN KEY (vehicleid) REFERENCES tbl_vehicle (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tbl_vehicle_expense_vehicleid ON tbl_vehicle_expense (vehicleid);
CREATE INDEX IF NOT EXISTS idx_tbl_vehicle_expense_date ON tbl_vehicle_expense (date);
