-- Add missing columns to healthcare_facilities table for pharmacy registration
USE pharmalink_db1;

-- Add owner_name column
ALTER TABLE healthcare_facilities 
ADD COLUMN owner_name VARCHAR(255) NULL AFTER facility_type;

-- Add postal_code column
ALTER TABLE healthcare_facilities 
ADD COLUMN postal_code VARCHAR(20) NULL AFTER state;

-- Add license_number column
ALTER TABLE healthcare_facilities 
ADD COLUMN license_number VARCHAR(50) NULL AFTER longitude;

-- Add registration_number column
ALTER TABLE healthcare_facilities 
ADD COLUMN registration_number VARCHAR(50) NULL AFTER license_number;

-- Add emergency_contact column
ALTER TABLE healthcare_facilities 
ADD COLUMN emergency_contact VARCHAR(20) NULL AFTER operating_hours;

-- Add accepts_insurance column
ALTER TABLE healthcare_facilities 
ADD COLUMN accepts_insurance BOOLEAN DEFAULT FALSE AFTER description;

-- Add has_delivery column
ALTER TABLE healthcare_facilities 
ADD COLUMN has_delivery BOOLEAN DEFAULT FALSE AFTER accepts_insurance;

-- Add has_consultation column
ALTER TABLE healthcare_facilities 
ADD COLUMN has_consultation BOOLEAN DEFAULT FALSE AFTER has_delivery;

-- Add images column
ALTER TABLE healthcare_facilities 
ADD COLUMN images JSON NULL AFTER has_consultation;

-- Update existing pharmacies with default values
UPDATE healthcare_facilities 
SET 
  owner_name = 'Default Owner',
  accepts_insurance = FALSE,
  has_delivery = TRUE,
  has_consultation = TRUE
WHERE facility_type = 'pharmacy' AND owner_name IS NULL;

-- Show the updated table structure
DESCRIBE healthcare_facilities;
