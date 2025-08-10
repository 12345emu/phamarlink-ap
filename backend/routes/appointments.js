const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { executeQuery, executeTransaction } = require('../config/database');

const router = express.Router();

// Get all appointments (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      date_from, 
      date_to,
      facility_id,
      user_id
    } = req.query;
    
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    // Filter by user role
    if (userRole === 'patient') {
      whereClause += ' AND a.user_id = ?';
      params.push(userId);
    } else if (userRole === 'doctor' || userRole === 'pharmacist') {
      whereClause += ' AND a.facility_id IN (SELECT id FROM healthcare_facilities WHERE user_id = ?)';
      params.push(userId);
    }
    // Admin can see all appointments
    
    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    
    if (date_from) {
      whereClause += ' AND DATE(a.appointment_date) >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ' AND DATE(a.appointment_date) <= ?';
      params.push(date_to);
    }
    
    if (facility_id) {
      whereClause += ' AND a.facility_id = ?';
      params.push(facility_id);
    }
    
    if (user_id && userRole === 'admin') {
      whereClause += ' AND a.user_id = ?';
      params.push(user_id);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a
      ${whereClause}
    `;
    
    const appointmentsQuery = `
      SELECT 
        a.*,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as facility_name, hf.address as facility_address,
        hf.latitude, hf.longitude
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      ${whereClause}
      ORDER BY a.appointment_date ASC, a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [countResult] = await executeQuery(countQuery, params);
    const appointments = await executeQuery(appointmentsQuery, [...params, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    const appointmentQuery = `
      SELECT 
        a.*,
        u.first_name, u.last_name, u.email, u.phone, u.date_of_birth, u.gender,
        hf.name as facility_name, hf.address as facility_address,
        hf.phone as facility_phone, hf.latitude, hf.longitude,
        pp.blood_type, pp.allergies, pp.medical_history
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      WHERE a.id = ?
    `;
    
    const [appointment] = await executeQuery(appointmentQuery, [id]);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    // Check access permissions
    if (userRole === 'patient' && appointment.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if ((userRole === 'doctor' || userRole === 'pharmacist') && 
        !await checkFacilityAccess(userId, appointment.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, data: appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new appointment
router.post('/', authenticateToken, requireRole(['patient']), [
  body('facility_id').isInt({ min: 1 }),
  body('appointment_date').isISO8601(),
  body('appointment_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('appointment_type').isIn(['consultation', 'checkup', 'followup', 'emergency', 'routine']),
  body('reason').isLength({ min: 10, max: 500 }).trim(),
  body('symptoms').optional().isArray(),
  body('preferred_doctor').optional().isInt({ min: 1 }),
  body('notes').optional().isLength({ max: 200 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }
    
    const appointmentData = req.body;
    const userId = req.user.id;
    
    // Check if facility exists and is active
    const [facility] = await executeQuery(
      'SELECT id, facility_type FROM healthcare_facilities WHERE id = ? AND is_active = true',
      [appointmentData.facility_id]
    );
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    
    // Check if appointment time is available
    const appointmentDateTime = `${appointmentData.appointment_date} ${appointmentData.appointment_time}`;
    const [conflicting] = await executeQuery(
      `SELECT id FROM appointments 
       WHERE facility_id = ? 
       AND appointment_date = ? 
       AND appointment_time = ? 
       AND status IN ('confirmed', 'pending')`,
      [appointmentData.facility_id, appointmentData.appointment_date, appointmentData.appointment_time]
    );
    
    if (conflicting.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Appointment time is not available' 
      });
    }
    
    // Check if appointment is in the future
    const appointmentDate = new Date(appointmentDateTime);
    if (appointmentDate <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Appointment must be scheduled for a future date and time' 
      });
    }
    
    const insertQuery = `
      INSERT INTO appointments (
        user_id, facility_id, appointment_date, appointment_time, appointment_type,
        reason, symptoms, preferred_doctor, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const [result] = await executeQuery(insertQuery, [
      userId,
      appointmentData.facility_id,
      appointmentData.appointment_date,
      appointmentData.appointment_time,
      appointmentData.appointment_type,
      appointmentData.reason,
      JSON.stringify(appointmentData.symptoms || []),
      appointmentData.preferred_doctor || null,
      appointmentData.notes || null
    ]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Appointment scheduled successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update appointment status (doctor/pharmacist/admin only)
router.patch('/:id/status', authenticateToken, requireRole(['doctor', 'pharmacist', 'admin']), [
  body('status').isIn(['confirmed', 'cancelled', 'completed', 'rescheduled', 'no_show']),
  body('notes').optional().isLength({ max: 200 }).trim(),
  body('rescheduled_date').optional().isISO8601(),
  body('rescheduled_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }
    
    const { id } = req.params;
    const { status, notes, rescheduled_date, rescheduled_time } = req.body;
    const userId = req.user.id;
    
    // Check if appointment exists and user has access
    const [appointment] = await executeQuery(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (!await checkFacilityAccess(userId, appointment.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Handle rescheduling
    if (status === 'rescheduled' && (rescheduled_date || rescheduled_time)) {
      const newDate = rescheduled_date || appointment.appointment_date;
      const newTime = rescheduled_time || appointment.appointment_time;
      
      // Check if new time is available
      const [conflicting] = await executeQuery(
        `SELECT id FROM appointments 
         WHERE facility_id = ? 
         AND appointment_date = ? 
         AND appointment_time = ? 
         AND id != ? 
         AND status IN ('confirmed', 'pending')`,
        [appointment.facility_id, newDate, newTime, id]
      );
      
      if (conflicting.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Rescheduled time is not available' 
        });
      }
      
      // Update appointment with new date/time
      await executeQuery(
        `UPDATE appointments 
         SET status = ?, notes = ?, appointment_date = ?, appointment_time = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, notes, newDate, newTime, id]
      );
    } else {
      // Update status only
      await executeQuery(
        `UPDATE appointments 
         SET status = ?, notes = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, notes, id]
      );
    }
    
    res.json({ success: true, message: 'Appointment status updated successfully' });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Cancel appointment (patient only)
router.patch('/:id/cancel', authenticateToken, requireRole(['patient']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if appointment exists and belongs to user
    const [appointment] = await executeQuery(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }
    
    if (appointment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed appointment' });
    }
    
    // Check if cancellation is within allowed time (e.g., 24 hours before)
    const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Appointments can only be cancelled at least 24 hours in advance' 
      });
    }
    
    await executeQuery(
      'UPDATE appointments SET status = "cancelled", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get available appointment slots
router.get('/facility/:facilityId/slots', async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { date, appointment_type } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date parameter is required' 
      });
    }
    
    // Check if facility exists
    const [facility] = await executeQuery(
      'SELECT id, operating_hours FROM healthcare_facilities WHERE id = ? AND is_active = true',
      [facilityId]
    );
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    
    // Generate available time slots (basic implementation)
    const availableSlots = generateTimeSlots(date, facility.operating_hours);
    
    // Filter out booked slots
    const [bookedSlots] = await executeQuery(
      `SELECT appointment_time FROM appointments 
       WHERE facility_id = ? 
       AND appointment_date = ? 
       AND status IN ('confirmed', 'pending')`,
      [facilityId, date]
    );
    
    const bookedTimes = bookedSlots.map(slot => slot.appointment_time);
    const freeSlots = availableSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({ 
      success: true, 
      data: { 
        date, 
        facility_id: facilityId, 
        available_slots: freeSlots 
      } 
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper function to check facility access
async function checkFacilityAccess(userId, facilityId) {
  const [facility] = await executeQuery(
    'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?',
    [facilityId, userId]
  );
  return facility.length > 0;
}

// Helper function to generate time slots
function generateTimeSlots(date, operatingHours) {
  // Basic implementation - generates slots from 9 AM to 5 PM
  // In a real app, this would parse operating_hours and generate appropriate slots
  const slots = [];
  for (let hour = 9; hour < 17; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

module.exports = router; 