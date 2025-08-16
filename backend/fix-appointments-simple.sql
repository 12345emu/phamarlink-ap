-- Simple script to fix appointments table structure
-- Run this in phpMyAdmin or MySQL workbench

USE pharmalink_db;

-- First, let's check if the appointments table exists and what structure it has
DESCRIBE appointments;

-- If the table exists but has wrong structure, drop it
DROP TABLE IF EXISTS appointments;

-- Create the new appointments table with correct structure
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type ENUM('consultation', 'checkup', 'followup', 'emergency', 'routine') NOT NULL,
    reason TEXT NOT NULL,
    symptoms JSON,
    preferred_doctor INT,
    notes TEXT,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled', 'no_show') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_doctor) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_facility_id ON appointments(facility_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_datetime ON appointments(appointment_date, appointment_time);

-- Add operating_hours column to healthcare_facilities if it doesn't exist
ALTER TABLE healthcare_facilities 
ADD COLUMN IF NOT EXISTS operating_hours JSON;

-- Update sample facilities with operating hours
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

-- Insert sample appointment data for testing
INSERT INTO appointments (
    user_id, 
    facility_id, 
    appointment_date, 
    appointment_time, 
    appointment_type, 
    reason, 
    status
) VALUES 
(1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', 'consultation', 'General health checkup and consultation', 'pending'),
(1, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:30:00', 'checkup', 'Routine medical examination and blood pressure check', 'pending'),
(1, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 'consultation', 'Follow-up consultation for previous treatment', 'confirmed'),
(1, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00:00', 'routine', 'Annual health screening and wellness check', 'pending');

-- Show the results
SELECT 'Appointments table created successfully!' as message;
SELECT COUNT(*) as total_appointments FROM appointments; 