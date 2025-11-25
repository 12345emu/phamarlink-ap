const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'));
  }
});

// ==================== SCHEDULE MANAGEMENT ====================

// Get staff schedules
router.get('/schedules/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { facilityId } = req.query;

    let query = 'SELECT * FROM staff_schedules WHERE staff_id = ?';
    const params = [staffId];

    if (facilityId) {
      query += ' AND facility_id = ?';
      params.push(facilityId);
    }

    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create/Update schedule
router.post('/schedules', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('dayOfWeek').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('breakDuration').optional().isInt({ min: 0, max: 480 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { staffId, facilityId, dayOfWeek, startTime, endTime, breakDuration = 30 } = req.body;

    // Check if schedule exists
    const checkQuery = 'SELECT id FROM staff_schedules WHERE staff_id = ? AND day_of_week = ?';
    const checkResult = await executeQuery(checkQuery, [staffId, dayOfWeek]);

    if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
      // Update existing
      const updateQuery = `
        UPDATE staff_schedules 
        SET start_time = ?, end_time = ?, break_duration = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const updateResult = await executeQuery(updateQuery, [
        startTime, endTime, breakDuration, checkResult.data[0].id
      ]);

      if (!updateResult.success) {
        return res.status(500).json({ success: false, message: 'Failed to update schedule' });
      }
    } else {
      // Create new
      const insertQuery = `
        INSERT INTO staff_schedules (staff_id, facility_id, day_of_week, start_time, end_time, break_duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const insertResult = await executeQuery(insertQuery, [
        staffId, facilityId, dayOfWeek, startTime, endTime, breakDuration
      ]);

      if (!insertResult.success) {
        return res.status(500).json({ success: false, message: 'Failed to create schedule' });
      }
    }

    res.json({ success: true, message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete schedule
router.delete('/schedules/:id', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery('DELETE FROM staff_schedules WHERE id = ?', [id]);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to delete schedule' });
    }

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== ATTENDANCE MANAGEMENT ====================

// Get attendance records
router.get('/attendance/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate, facilityId } = req.query;

    let query = 'SELECT * FROM staff_attendance WHERE staff_id = ?';
    const params = [staffId];

    if (facilityId) {
      query += ' AND facility_id = ?';
      params.push(facilityId);
    }

    if (startDate && endDate) {
      query += ' AND attendance_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY attendance_date DESC LIMIT 100';

    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Record attendance (clock in/out)
router.post('/attendance', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('attendanceDate').isISO8601(),
  body('clockInTime').optional().isISO8601(),
  body('clockOutTime').optional().isISO8601(),
  body('status').isIn(['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { staffId, facilityId, attendanceDate, clockInTime, clockOutTime, status, notes } = req.body;

    // Calculate hours worked if both times provided
    let hoursWorked = 0;
    if (clockInTime && clockOutTime) {
      const start = new Date(clockInTime);
      const end = new Date(clockOutTime);
      hoursWorked = (end - start) / (1000 * 60 * 60); // Convert to hours
    }

    // Check if record exists
    const checkQuery = 'SELECT id FROM staff_attendance WHERE staff_id = ? AND attendance_date = ?';
    const checkResult = await executeQuery(checkQuery, [staffId, attendanceDate]);

    if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
      // Update existing
      const updateQuery = `
        UPDATE staff_attendance 
        SET clock_in_time = ?, clock_out_time = ?, status = ?, hours_worked = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const updateResult = await executeQuery(updateQuery, [
        clockInTime || null, clockOutTime || null, status, hoursWorked, notes || null,
        checkResult.data[0].id
      ]);

      if (!updateResult.success) {
        return res.status(500).json({ success: false, message: 'Failed to update attendance' });
      }
    } else {
      // Create new
      const insertQuery = `
        INSERT INTO staff_attendance (staff_id, facility_id, attendance_date, clock_in_time, clock_out_time, status, hours_worked, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const insertResult = await executeQuery(insertQuery, [
        staffId, facilityId, attendanceDate, clockInTime || null, clockOutTime || null,
        status, hoursWorked, notes || null
      ]);

      if (!insertResult.success) {
        return res.status(500).json({ success: false, message: 'Failed to record attendance' });
      }
    }

    res.json({ success: true, message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== LEAVE MANAGEMENT ====================

// Get leave requests
router.get('/leave-requests/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status, facilityId } = req.query;

    let query = 'SELECT * FROM leave_requests WHERE staff_id = ?';
    const params = [staffId];

    if (facilityId) {
      query += ' AND facility_id = ?';
      params.push(facilityId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create leave request
router.post('/leave-requests', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('leaveType').isIn(['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'unpaid']),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('reason').trim().isLength({ min: 10, max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { staffId, facilityId, leaveType, startDate, endDate, reason } = req.body;

    // Calculate days requested
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const insertQuery = `
      INSERT INTO leave_requests (staff_id, facility_id, leave_type, start_date, end_date, days_requested, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    const result = await executeQuery(insertQuery, [
      staffId, facilityId, leaveType, startDate, endDate, daysRequested, reason
    ]);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to create leave request' });
    }

    res.json({ success: true, message: 'Leave request created successfully', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Approve/Reject leave request
router.put('/leave-requests/:id', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('status').isIn(['approved', 'rejected']),
  body('rejectionReason').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const updateQuery = `
      UPDATE leave_requests 
      SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const result = await executeQuery(updateQuery, [
      status, req.user.id, rejectionReason || null, id
    ]);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to update leave request' });
    }

    // Update leave balances if approved
    if (status === 'approved') {
      // TODO: Update leave_balances table
    }

    res.json({ success: true, message: `Leave request ${status} successfully` });
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get leave balances
router.get('/leave-balances/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const query = 'SELECT * FROM leave_balances WHERE staff_id = ? AND year = ?';
    const result = await executeQuery(query, [staffId, year]);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch leave balances' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== PERFORMANCE REVIEWS ====================

// Get performance reviews
router.get('/performance-reviews/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const query = 'SELECT * FROM performance_reviews WHERE staff_id = ? ORDER BY review_period_end DESC LIMIT 20';
    const result = await executeQuery(query, [staffId]);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch performance reviews' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create performance review
router.post('/performance-reviews', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('reviewPeriodStart').isISO8601(),
  body('reviewPeriodEnd').isISO8601(),
  body('overallRating').isFloat({ min: 0, max: 5 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      staffId, facilityId, reviewPeriodStart, reviewPeriodEnd,
      overallRating, punctualityRating, qualityOfWorkRating,
      communicationRating, teamworkRating, professionalismRating,
      strengths, areasForImprovement, goals, comments
    } = req.body;

    const insertQuery = `
      INSERT INTO performance_reviews (
        staff_id, facility_id, review_period_start, review_period_end, reviewed_by,
        overall_rating, punctuality_rating, quality_of_work_rating,
        communication_rating, teamwork_rating, professionalism_rating,
        strengths, areas_for_improvement, goals, comments, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `;
    const result = await executeQuery(insertQuery, [
      staffId, facilityId, reviewPeriodStart, reviewPeriodEnd, req.user.id,
      overallRating, punctualityRating || null, qualityOfWorkRating || null,
      communicationRating || null, teamworkRating || null, professionalismRating || null,
      strengths || null, areasForImprovement || null, goals || null, comments || null
    ]);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to create performance review' });
    }

    res.json({ success: true, message: 'Performance review created successfully', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating performance review:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== DOCUMENTS ====================

// Get staff documents
router.get('/documents/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { documentType } = req.query;

    let query = 'SELECT * FROM staff_documents WHERE staff_id = ?';
    const params = [staffId];

    if (documentType) {
      query += ' AND document_type = ?';
      params.push(documentType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Upload document
router.post('/documents', authenticateToken, requireRole(['facility-admin', 'admin']), upload.single('document'), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('documentType').isIn(['contract', 'license', 'certification', 'id_card', 'resume', 'other']),
  body('documentName').trim().isLength({ min: 1, max: 255 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { staffId, facilityId, documentType, documentName, expiryDate, notes } = req.body;

    const insertQuery = `
      INSERT INTO staff_documents (staff_id, facility_id, document_type, document_name, file_path, expiry_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await executeQuery(insertQuery, [
      staffId, facilityId, documentType, documentName,
      `/uploads/documents/${req.file.filename}`, expiryDate || null, notes || null
    ]);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to upload document' });
    }

    res.json({ success: true, message: 'Document uploaded successfully', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== TASKS ====================

// Get staff tasks
router.get('/tasks/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status } = req.query;

    let query = 'SELECT * FROM staff_tasks WHERE staff_id = ?';
    const params = [staffId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create task
router.post('/tasks', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('taskTitle').trim().isLength({ min: 1, max: 255 }),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { staffId, facilityId, taskTitle, taskDescription, priority, dueDate, notes } = req.body;

    const insertQuery = `
      INSERT INTO staff_tasks (staff_id, facility_id, assigned_by, task_title, task_description, priority, due_date, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    const result = await executeQuery(insertQuery, [
      staffId, facilityId, req.user.id, taskTitle, taskDescription || null,
      priority, dueDate || null, notes || null
    ]);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to create task' });
    }

    res.json({ success: true, message: 'Task assigned successfully', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== NOTES ====================

// Get staff notes
router.get('/notes/:staffId', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { noteType } = req.query;

    let query = 'SELECT * FROM staff_notes WHERE staff_id = ?';
    const params = [staffId];

    if (noteType) {
      query += ' AND note_type = ?';
      params.push(noteType);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch notes' });
    }

    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create note
router.post('/notes', authenticateToken, requireRole(['facility-admin', 'admin']), [
  body('staffId').isInt({ min: 1 }),
  body('facilityId').isInt({ min: 1 }),
  body('noteType').isIn(['general', 'warning', 'commendation', 'disciplinary', 'training', 'other']),
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('content').trim().isLength({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { staffId, facilityId, noteType, title, content, isConfidential } = req.body;

    const insertQuery = `
      INSERT INTO staff_notes (staff_id, facility_id, note_type, title, content, created_by, is_confidential)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await executeQuery(insertQuery, [
      staffId, facilityId, noteType, title, content, req.user.id, isConfidential || false
    ]);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to create note' });
    }

    res.json({ success: true, message: 'Note created successfully', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

