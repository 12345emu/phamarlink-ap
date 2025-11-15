-- Add image field to medicines table
USE pharmalink_db;

ALTER TABLE medicines 
ADD COLUMN image VARCHAR(500) NULL AFTER contraindications;

