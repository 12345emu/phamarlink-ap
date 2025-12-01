-- Add has_delivery and has_consultation columns to healthcare_facilities table
USE pharmalink_db1;

-- Check if columns exist before adding (MySQL doesn't support IF NOT EXISTS for ALTER TABLE)
-- Add has_delivery column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = "healthcare_facilities";
SET @columnname = "has_delivery";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column has_delivery already exists.' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN DEFAULT FALSE AFTER accepts_insurance;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add has_consultation column if it doesn't exist
SET @columnname = "has_consultation";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column has_consultation already exists.' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN DEFAULT FALSE AFTER has_delivery;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Show the updated table structure
DESCRIBE healthcare_facilities;

