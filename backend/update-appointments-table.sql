-- Update Appointments Table Structure
-- This script updates the appointments table to match the backend API requirements

USE pharmalink_db;

-- Drop the existing appointments table if it exists
DROP TABLE IF EXISTS appointments;

-- Create the new appointments table with the correct structure
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

-- Insert some sample appointment data for testing
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

-- Update the healthcare_facilities table to ensure it has the correct structure
-- Add operating_hours column if it doesn't exist
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
WHERE id IN (1, 2, 3);

-- Add some doctors to the users table for preferred_doctor references
INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone) VALUES
('dr.sarah@hospital.com', '$2b$10$hashedpassword123', 'doctor', 'Dr. Sarah', 'Mensah', '+233 20 111 2222'),
('dr.michael@hospital.com', '$2b$10$hashedpassword456', 'doctor', 'Dr. Michael', 'Osei', '+233 20 333 4444'),
('dr.akua@clinic.com', '$2b$10$hashedpassword789', 'doctor', 'Dr. Akua', 'Addo', '+233 20 555 6666')
ON DUPLICATE KEY UPDATE 
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    phone = VALUES(phone);

-- Update some appointments to have preferred doctors
UPDATE appointments 
SET preferred_doctor = 4 
WHERE id = 1;

UPDATE appointments 
SET preferred_doctor = 5 
WHERE id = 2;

-- Show the updated appointments table structure
DESCRIBE appointments;

-- Show sample data
SELECT 
    a.id,
    u.first_name,
    u.last_name,
    hf.name as facility_name,
    a.appointment_date,
    a.appointment_time,
    a.appointment_type,
    a.reason,
    a.status
FROM appointments a
JOIN users u ON a.user_id = u.id
JOIN healthcare_facilities hf ON a.facility_id = hf.id
ORDER BY a.appointment_date, a.appointment_time; 