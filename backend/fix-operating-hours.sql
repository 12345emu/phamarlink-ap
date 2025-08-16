-- Fix corrupted operating_hours data
-- Run this in phpMyAdmin

USE pharmalink_db1;

-- Update facility 12 with correct operating hours
UPDATE healthcare_facilities 
SET operating_hours = JSON_OBJECT(
    'monday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'tuesday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'wednesday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'thursday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'friday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'saturday', JSON_OBJECT('open', '09:00', 'close', '17:00', 'isOpen', true),
    'sunday', JSON_OBJECT('open', '09:00', 'close', '17:00', 'isOpen', true)
)
WHERE id = 12;

-- Also update other facilities to be safe
UPDATE healthcare_facilities 
SET operating_hours = JSON_OBJECT(
    'monday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'tuesday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'wednesday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'thursday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'friday', JSON_OBJECT('open', '08:00', 'close', '18:00', 'isOpen', true),
    'saturday', JSON_OBJECT('open', '09:00', 'close', '17:00', 'isOpen', true),
    'sunday', JSON_OBJECT('open', '09:00', 'close', '17:00', 'isOpen', true)
)
WHERE id IN (4, 5, 6);

-- Verify the fix
SELECT id, name, operating_hours FROM healthcare_facilities WHERE id IN (4, 5, 6, 12); 