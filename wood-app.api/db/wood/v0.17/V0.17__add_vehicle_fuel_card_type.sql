-- V0.17__add_vehicle_fuel_card_type.sql
-- Add fuel card type (Shell, Total, Ola, etc.) to vehicle table

ALTER TABLE tbl_vehicle
ADD COLUMN fuelcardtype VARCHAR(100);
