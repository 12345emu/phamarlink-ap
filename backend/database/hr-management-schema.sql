-- HR Management Database Schema for PharmaLink
-- Comprehensive staff management tables

USE pharmalink_db1;

-- 1. Staff Schedules Table
CREATE TABLE IF NOT EXISTS staff_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INT DEFAULT 30 COMMENT 'Break duration in minutes',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_day (staff_id, day_of_week)
);

-- 2. Staff Attendance Table
CREATE TABLE IF NOT EXISTS staff_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    status ENUM('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday') DEFAULT 'absent',
    hours_worked DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_date (staff_id, attendance_date)
);

-- 3. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    leave_type ENUM('sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'unpaid') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    leave_type ENUM('sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity') NOT NULL,
    total_days INT DEFAULT 0,
    used_days INT DEFAULT 0,
    remaining_days INT DEFAULT 0,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_leave_year (staff_id, leave_type, year)
);

-- 5. Performance Reviews Table
CREATE TABLE IF NOT EXISTS performance_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewed_by INT NOT NULL,
    overall_rating DECIMAL(3,2) COMMENT 'Rating out of 5.00',
    punctuality_rating DECIMAL(3,2),
    quality_of_work_rating DECIMAL(3,2),
    communication_rating DECIMAL(3,2),
    teamwork_rating DECIMAL(3,2),
    professionalism_rating DECIMAL(3,2),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    comments TEXT,
    status ENUM('draft', 'submitted', 'acknowledged') DEFAULT 'draft',
    acknowledged_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Staff Documents Table
CREATE TABLE IF NOT EXISTS staff_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    document_type ENUM('contract', 'license', 'certification', 'id_card', 'resume', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT,
    verified_at DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Staff Tasks/Assignments Table
CREATE TABLE IF NOT EXISTS staff_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    assigned_by INT NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    due_date DATETIME,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    completion_percentage INT DEFAULT 0,
    completed_at DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Staff Notes/Disciplinary Actions Table
CREATE TABLE IF NOT EXISTS staff_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    facility_id INT NOT NULL,
    note_type ENUM('general', 'warning', 'commendation', 'disciplinary', 'training', 'other') DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INT NOT NULL,
    is_confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES healthcare_professionals(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX idx_schedules_facility ON staff_schedules(facility_id);
CREATE INDEX idx_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX idx_attendance_date ON staff_attendance(attendance_date);
CREATE INDEX idx_leave_staff ON leave_requests(staff_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_performance_staff ON performance_reviews(staff_id);
CREATE INDEX idx_documents_staff ON staff_documents(staff_id);
CREATE INDEX idx_documents_type ON staff_documents(document_type);
CREATE INDEX idx_tasks_staff ON staff_tasks(staff_id);
CREATE INDEX idx_tasks_status ON staff_tasks(status);
CREATE INDEX idx_notes_staff ON staff_notes(staff_id);
CREATE INDEX idx_notes_type ON staff_notes(note_type);

