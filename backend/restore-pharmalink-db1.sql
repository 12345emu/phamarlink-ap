-- PharmaLink Database Recreation Script
-- Based on pharmalink_db1 database structure
-- Created: 2025-09-08

-- Drop database if exists and create new one
DROP DATABASE IF EXISTS pharmalink_db1;
CREATE DATABASE pharmalink_db1;
USE pharmalink_db1;

-- 1. Users Table (Core user accounts)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('patient', 'doctor', 'pharmacist', 'admin') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Patient Profiles (Extended patient information)
CREATE TABLE patient_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    emergency_contact VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    insurance_provider VARCHAR(100),
    insurance_number VARCHAR(100),
    blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    allergies TEXT,
    medical_history TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    postal_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Healthcare Facilities (Pharmacies, Hospitals, Clinics)
CREATE TABLE healthcare_facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    facility_type ENUM('pharmacy', 'hospital', 'clinic') NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    operating_hours JSON,
    services TEXT,
    description TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Healthcare Professionals (Doctors, Pharmacists)
CREATE TABLE healthcare_professionals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT,
    license_number VARCHAR(100),
    specialization VARCHAR(100),
    experience_years INT,
    education TEXT,
    certifications TEXT,
    bio TEXT,
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE SET NULL
);

-- 5. Medicines (Available medicines catalog)
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    prescription_required BOOLEAN DEFAULT FALSE,
    dosage_form ENUM('tablet', 'capsule', 'liquid', 'injection', 'cream', 'inhaler'),
    strength VARCHAR(100),
    manufacturer VARCHAR(255),
    active_ingredients TEXT,
    side_effects TEXT,
    contraindications TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Pharmacy Medicines (Stock and pricing)
CREATE TABLE pharmacy_medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pharmacy_id INT NOT NULL,
    medicine_id INT NOT NULL,
    stock_quantity INT DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    expiry_date DATE,
    batch_number VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pharmacy_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

-- 7. Appointments (Doctor consultations)
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    facility_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    status ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    appointment_type ENUM('consultation', 'follow_up', 'emergency', 'routine_checkup'),
    symptoms TEXT,
    diagnosis TEXT,
    prescription TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE
);

-- 8. Orders (Medicine orders)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    pharmacy_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method ENUM('cash', 'mobile_money', 'card', 'bank_transfer'),
    delivery_address TEXT,
    delivery_instructions TEXT,
    estimated_delivery DATETIME,
    actual_delivery DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE
);

-- 9. Order Items (Individual items in orders)
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    medicine_id INT NOT NULL,
    pharmacy_medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_medicine_id) REFERENCES pharmacy_medicines(id) ON DELETE CASCADE
);

-- 10. Order Tracking (Order status updates)
CREATE TABLE order_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled') NOT NULL,
    location VARCHAR(255),
    notes TEXT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Cart Items (Shopping cart)
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    pharmacy_medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_medicine_id) REFERENCES pharmacy_medicines(id) ON DELETE CASCADE
);

-- 12. Chat Conversations (Real-time messaging)
CREATE TABLE chat_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    professional_id INT NOT NULL,
    conversation_type ENUM('consultation', 'general', 'emergency'),
    status ENUM('active', 'closed', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Chat Messages (Individual messages)
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'prescription') DEFAULT 'text',
    message_content TEXT NOT NULL,
    file_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Reviews and Ratings
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_type ENUM('facility', 'doctor', 'medicine', 'service'),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE
);

-- 15. Facility Reviews (Alternative reviews table)
CREATE TABLE facility_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE
);

-- 16. Notifications (User notifications)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('appointment', 'order', 'chat', 'system', 'reminder'),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_facilities_location ON healthcare_facilities(latitude, longitude);
CREATE INDEX idx_facilities_type ON healthcare_facilities(facility_type);
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_pharmacy_medicines_pharmacy ON pharmacy_medicines(pharmacy_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_chat_conversations_users ON chat_conversations(patient_id, professional_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_order_tracking_order ON order_tracking(order_id);

-- Insert Sample Data
-- Sample Users
INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone) VALUES
('john.doe@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'patient', 'John', 'Doe', '+233 24 123 4567'),
('dr.kwame@hospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'doctor', 'Dr. Kwame', 'Mensah', '+233 20 987 6543'),
('pharmacist.am@pharmacy.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'pharmacist', 'Pharmacist', 'Am', '+233 26 555 1234'),
('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'patient', 'Test', 'User', '+233 24 123 4567'),
('test@pharmalink.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'patient', 'Test', 'Patient', '+233 24 123 4567');

-- Sample Healthcare Facilities
INSERT INTO healthcare_facilities (name, facility_type, address, city, latitude, longitude, phone) VALUES
('Holy Family Hospital', 'hospital', '123 Hospital Road, Accra', 'Accra', 5.5600, -0.2057, '+233 30 123 4567'),
('CityMed Pharmacy', 'pharmacy', '456 Pharmacy Street, Accra', 'Accra', 5.5650, -0.2100, '+233 30 987 6543'),
('East Legon Clinic', 'clinic', '789 Clinic Avenue, Accra', 'Accra', 5.5550, -0.2000, '+233 30 555 1234');

-- Sample Healthcare Professionals
INSERT INTO healthcare_professionals (user_id, facility_id, license_number, specialization, experience_years) VALUES
(2, 1, 'MD123456', 'General Medicine', 10),
(3, 2, 'PH123456', 'Pharmacy', 8);

-- Sample Medicines
INSERT INTO medicines (name, generic_name, brand_name, description, category, prescription_required, dosage_form, strength, manufacturer) VALUES
('Paracetamol', 'Acetaminophen', 'Tylenol', 'Pain reliever and fever reducer', 'Analgesic', FALSE, 'tablet', '500mg', 'Generic Pharmaceuticals'),
('Amoxicillin', 'Amoxicillin', 'Amoxil', 'Antibiotic for bacterial infections', 'Antibiotic', TRUE, 'capsule', '250mg', 'PharmaCorp'),
('Ibuprofen', 'Ibuprofen', 'Advil', 'Anti-inflammatory pain reliever', 'NSAID', FALSE, 'tablet', '400mg', 'Pain Relief Inc'),
('Aspirin', 'Acetylsalicylic acid', 'Bayer', 'Pain reliever and anti-inflammatory', 'NSAID', FALSE, 'tablet', '100mg', 'Bayer AG'),
('Metformin', 'Metformin', 'Glucophage', 'Diabetes medication', 'Antidiabetic', TRUE, 'tablet', '500mg', 'Diabetes Corp');

-- Sample Pharmacy Medicines
INSERT INTO pharmacy_medicines (pharmacy_id, medicine_id, stock_quantity, price, discount_price) VALUES
(2, 1, 100, 10.00, 8.50),
(2, 2, 50, 25.00, NULL),
(2, 3, 75, 15.00, 12.00),
(2, 4, 200, 5.00, 4.00),
(2, 5, 30, 35.00, 30.00);

-- Sample Patient Profile
INSERT INTO patient_profiles (user_id, emergency_contact, emergency_contact_name, blood_type, allergies, address, city) VALUES
(1, '+233 24 999 8888', 'Jane Doe', 'O+', 'Penicillin', '123 Main Street, Accra', 'Accra'),
(4, '+233 24 999 8888', 'Test Emergency', 'A+', 'None', '456 Test Street, Accra', 'Accra'),
(5, '+233 24 999 8888', 'Test Emergency 2', 'B+', 'None', '789 Test Avenue, Accra', 'Accra');

-- Sample Appointments
INSERT INTO appointments (patient_id, doctor_id, facility_id, appointment_date, status, appointment_type, symptoms) VALUES
(1, 2, 1, '2025-09-10 10:00:00', 'scheduled', 'consultation', 'Fever and headache'),
(4, 2, 1, '2025-09-11 14:00:00', 'scheduled', 'routine_checkup', 'Regular checkup');

-- Sample Orders
INSERT INTO orders (order_number, patient_id, pharmacy_id, total_amount, final_amount, status, payment_status, delivery_address) VALUES
('ORD001', 1, 2, 25.00, 25.00, 'delivered', 'paid', '123 Main Street, Accra'),
('ORD002', 4, 2, 15.00, 12.00, 'pending', 'pending', '456 Test Street, Accra');

-- Sample Order Items
INSERT INTO order_items (order_id, medicine_id, pharmacy_medicine_id, quantity, unit_price, total_price) VALUES
(1, 2, 2, 1, 25.00, 25.00),
(2, 3, 3, 1, 15.00, 12.00);

-- Sample Cart Items
INSERT INTO cart_items (user_id, pharmacy_medicine_id, quantity) VALUES
(1, 1, 2),
(4, 4, 1);

-- Sample Reviews
INSERT INTO reviews (user_id, facility_id, rating, review_text, review_type) VALUES
(1, 1, 5, 'Excellent service and professional staff', 'facility'),
(4, 2, 4, 'Good pharmacy with reasonable prices', 'facility');

-- Sample Notifications
INSERT INTO notifications (user_id, title, message, notification_type) VALUES
(1, 'Appointment Reminder', 'Your appointment is scheduled for tomorrow at 10:00 AM', 'appointment'),
(4, 'Order Update', 'Your order has been confirmed and is being prepared', 'order');

-- Set database options
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- Show completion message
SELECT 'PharmaLink Database pharmalink_db1 has been successfully recreated!' as Status;
