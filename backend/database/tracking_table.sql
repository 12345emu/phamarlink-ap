-- Create order_tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_delivery DATETIME,
  actual_delivery DATETIME,
  tracking_number VARCHAR(100) UNIQUE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX idx_order_tracking_tracking_number ON order_tracking(tracking_number); 