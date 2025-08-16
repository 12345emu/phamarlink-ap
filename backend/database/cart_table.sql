-- Cart Table for PharmaLink
-- This table stores user cart items until checkout

USE pharmalink_db;

-- Create cart table
CREATE TABLE IF NOT EXISTS cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    medicine_id INT NOT NULL,
    pharmacy_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_per_unit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_medicine_pharmacy (user_id, medicine_id, pharmacy_id)
);

-- Add indexes for better performance
CREATE INDEX idx_cart_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_medicine_id ON cart_items(medicine_id);
CREATE INDEX idx_cart_pharmacy_id ON cart_items(pharmacy_id); 