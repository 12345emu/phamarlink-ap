-- Prescription Medicines Table
-- This table stores individual medicines within a prescription
CREATE TABLE IF NOT EXISTS prescription_medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_id INT NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    INDEX idx_prescription_id (prescription_id),
    INDEX idx_medicine_id (medicine_id)
);

-- Prescription Uploads Table
-- This table stores uploaded prescription images/documents
CREATE TABLE IF NOT EXISTS prescription_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('pending', 'processed', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- Add some sample prescription medicines data
-- Note: This assumes there are existing appointments with prescriptions
-- You may need to adjust the prescription_id values based on your actual data

-- Sample prescription medicines (uncomment and adjust as needed)
-- INSERT INTO prescription_medicines (prescription_id, medicine_id, dosage, frequency, duration, instructions, quantity) VALUES
-- (1, 1, '500mg', 'Twice daily', '7 days', 'Take with food', 14),
-- (1, 2, '250mg', 'Three times daily', '10 days', 'Take on empty stomach', 30),
-- (2, 3, '400mg', 'As needed', '5 days', 'Take with water', 10);
