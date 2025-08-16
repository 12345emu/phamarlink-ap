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
        hf.phone as facility_phone, hf.email as facility_email,
        hf.latitude, hf.longitude
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      ${whereClause}
      ORDER BY a.appointment_date ASC, a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const countResult = await executeQuery(countQuery, params);
    const appointmentsResult = await executeQuery(appointmentsQuery, [...params, parseInt(limit), offset]);
    
    if (!countResult.success || !appointmentsResult.success) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({
      success: true,
      data: {
        appointments: appointmentsResult.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.data[0].total,
          pages: Math.ceil(countResult.data[0].total / limit)
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
        a.id, a.user_id, a.facility_id, a.appointment_date, a.appointment_time, 
        a.appointment_type, a.reason, a.symptoms, a.preferred_doctor, a.notes, 
        a.status, a.created_at, a.updated_at,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as facility_name, hf.address as facility_address,
        hf.phone as facility_phone, hf.latitude, hf.longitude
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      WHERE a.id = ?
    `;
    
    const appointmentResult = await executeQuery(appointmentQuery, [id]);
    
    if (!appointmentResult.success || !appointmentResult.data || appointmentResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    const appointment = appointmentResult.data[0];
    
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
    console.log('🔍 POST /appointments - Starting appointment creation');
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 User ID:', req.user.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }
    
    const appointmentData = req.body;
    const userId = req.user.id;
    
    console.log('🔍 Checking facility existence...');
    // Check if facility exists and is active
    const facilityResult = await executeQuery(
      'SELECT id, facility_type FROM healthcare_facilities WHERE id = ? AND is_active = true',
      [appointmentData.facility_id]
    );
    
    console.log('🔍 Facility query result:', JSON.stringify(facilityResult, null, 2));
    
    if (!facilityResult.success || !facilityResult.data || facilityResult.data.length === 0) {
      console.log('❌ Facility not found');
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    
    console.log('🔍 Checking for conflicting appointments...');
    // Check if appointment time is available
    const appointmentDateTime = `${appointmentData.appointment_date} ${appointmentData.appointment_time}`;
    const conflictingResult = await executeQuery(
      `SELECT id FROM appointments 
       WHERE facility_id = ? 
       AND appointment_date = ? 
       AND appointment_time = ? 
       AND status IN ('confirmed', 'pending')`,
      [appointmentData.facility_id, appointmentData.appointment_date, appointmentData.appointment_time]
    );
    
    console.log('🔍 Conflicting appointments result:', JSON.stringify(conflictingResult, null, 2));
    
    if (conflictingResult.success && conflictingResult.data && conflictingResult.data.length > 0) {
      console.log('❌ Appointment time conflict found');
      return res.status(409).json({ 
        success: false, 
        message: 'Appointment time is not available' 
      });
    }
    
    console.log('🔍 Checking if appointment is in the future...');
    // Check if appointment is in the future
    const appointmentDate = new Date(appointmentDateTime);
    if (appointmentDate <= new Date()) {
      console.log('❌ Appointment is not in the future');
      return res.status(400).json({ 
        success: false, 
        message: 'Appointment must be scheduled for a future date and time' 
      });
    }
    
    console.log('🔍 Inserting appointment into database...');
    const insertQuery = `
      INSERT INTO appointments (
        user_id, facility_id, appointment_date, appointment_time, appointment_type,
        reason, symptoms, preferred_doctor, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const insertParams = [
      userId,
      appointmentData.facility_id,
      appointmentData.appointment_date,
      appointmentData.appointment_time,
      appointmentData.appointment_type,
      appointmentData.reason,
      JSON.stringify(appointmentData.symptoms || []),
      appointmentData.preferred_doctor || null,
      appointmentData.notes || null
    ];
    
    console.log('🔍 Insert query:', insertQuery);
    console.log('🔍 Insert parameters:', JSON.stringify(insertParams, null, 2));
    
    const insertResult = await executeQuery(insertQuery, insertParams);
    
    console.log('🔍 Insert result:', JSON.stringify(insertResult, null, 2));
    
    if (!insertResult.success) {
      console.log('❌ Insert failed:', insertResult.error);
      return res.status(500).json({ success: false, message: 'Failed to create appointment' });
    }
    
    console.log('✅ Appointment created successfully, ID:', insertResult.data.insertId);
    res.status(201).json({ 
      success: true, 
      message: 'Appointment scheduled successfully',
      data: { id: insertResult.data.insertId }
    });
  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    console.error('❌ Error stack:', error.stack);
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
    const appointmentResult = await executeQuery(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );
    
    if (!appointmentResult.success || !appointmentResult.data || appointmentResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    const appointment = appointmentResult.data[0];
    
    if (!await checkFacilityAccess(userId, appointment.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Handle rescheduling
    if (status === 'rescheduled' && (rescheduled_date || rescheduled_time)) {
      console.log('🔍 Rescheduling appointment:', { id, rescheduled_date, rescheduled_time });
      
      const newDate = rescheduled_date || appointment.appointment_date;
      const newTime = rescheduled_time || appointment.appointment_time;
      
      console.log('🔍 New date/time:', { newDate, newTime });
      
      // Check if new time is available
      const conflictingResult = await executeQuery(
        `SELECT id FROM appointments 
         WHERE facility_id = ? 
         AND appointment_date = ? 
         AND appointment_time = ? 
         AND id != ? 
         AND status IN ('confirmed', 'pending')`,
        [appointment.facility_id, newDate, newTime, id]
      );
      
      console.log('🔍 Conflicting appointments:', conflictingResult);
      
      if (conflictingResult.success && conflictingResult.data && conflictingResult.data.length > 0) {
        console.log('❌ Rescheduled time is not available');
        return res.status(409).json({ 
          success: false, 
          message: 'Rescheduled time is not available' 
        });
      }
      
      // Update appointment with new date/time
      const updateResult = await executeQuery(
        `UPDATE appointments 
         SET status = ?, notes = ?, appointment_date = ?, appointment_time = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, notes, newDate, newTime, id]
      );
      
      console.log('✅ Appointment rescheduled successfully:', updateResult);
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

// Reschedule appointment (patient only)
router.patch('/:id/reschedule', authenticateToken, requireRole(['patient']), [
  body('rescheduled_date').isISO8601(),
  body('rescheduled_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
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
    
    const { id } = req.params;
    const { rescheduled_date, rescheduled_time, notes } = req.body;
    const userId = req.user.id;
    
    console.log('🔍 Patient rescheduling appointment:', { id, rescheduled_date, rescheduled_time, userId });
    
    // Check if appointment exists and belongs to the user
    const appointmentResult = await executeQuery(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!appointmentResult.success || !appointmentResult.data || appointmentResult.data.length === 0) {
      console.log('❌ Appointment not found or access denied');
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    const appointment = appointmentResult.data[0];
    
    // Check if appointment is in the future
    const appointmentDateTime = `${appointment.appointment_date} ${appointment.appointment_time}`;
    const currentDateTime = new Date();
    const appointmentDate = new Date(appointmentDateTime);
    
    if (appointmentDate <= currentDateTime) {
      console.log('❌ Cannot reschedule past appointment');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot reschedule past appointments' 
      });
    }
    
    // Check if new appointment time is in the future
    const newAppointmentDateTime = `${rescheduled_date} ${rescheduled_time}`;
    const newAppointmentDate = new Date(newAppointmentDateTime);
    
    if (newAppointmentDate <= currentDateTime) {
      console.log('❌ New appointment time must be in the future');
      return res.status(400).json({ 
        success: false, 
        message: 'New appointment time must be in the future' 
      });
    }
    
    // Check if new time is available
    const conflictingResult = await executeQuery(
      `SELECT id FROM appointments 
       WHERE facility_id = ? 
       AND appointment_date = ? 
       AND appointment_time = ? 
       AND id != ? 
       AND status IN ('confirmed', 'pending')`,
      [appointment.facility_id, rescheduled_date, rescheduled_time, id]
    );
    
    console.log('🔍 Conflicting appointments check:', conflictingResult);
    
    if (conflictingResult.success && conflictingResult.data && conflictingResult.data.length > 0) {
      console.log('❌ Rescheduled time is not available');
      return res.status(409).json({ 
        success: false, 
        message: 'Rescheduled time is not available' 
      });
    }
    
    // Update appointment with new date/time
    const updateResult = await executeQuery(
      `UPDATE appointments 
       SET appointment_date = ?, appointment_time = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [rescheduled_date, rescheduled_time, notes || `Rescheduled to ${rescheduled_date} at ${rescheduled_time}`, id, userId]
    );
    
    if (!updateResult.success) {
      console.log('❌ Failed to update appointment:', updateResult.error);
      return res.status(500).json({ success: false, message: 'Failed to reschedule appointment' });
    }
    
    console.log('✅ Appointment rescheduled successfully:', updateResult);
    res.json({ 
      success: true, 
      message: 'Appointment rescheduled successfully',
      data: {
        id: parseInt(id),
        appointment_date: rescheduled_date,
        appointment_time: rescheduled_time
      }
    });
  } catch (error) {
    console.error('❌ Error rescheduling appointment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Cancel appointment (patient only)
router.patch('/:id/cancel', authenticateToken, requireRole(['patient']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if appointment exists and belongs to user
    const appointmentResult = await executeQuery(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!appointmentResult.success || !appointmentResult.data || appointmentResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    const appointment = appointmentResult.data[0];
    
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }
    
    if (appointment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed appointment' });
    }
    
    // Check if cancellation is within allowed time (e.g., 24 hours before)
    const appointmentDate = new Date(appointment.appointment_date);
    const [hours, minutes, seconds] = appointment.appointment_time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
    
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Appointments can only be cancelled at least 24 hours in advance' 
      });
    }
    
    const updateResult = await executeQuery(
      'UPDATE appointments SET status = "cancelled", updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    if (!updateResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to update appointment status' });
    }
    
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
    const facilityResult = await executeQuery(
      'SELECT id, operating_hours FROM healthcare_facilities WHERE id = ? AND is_active = true',
      [facilityId]
    );
    
    if (!facilityResult.success || !facilityResult.data || facilityResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    
    const facility = facilityResult.data[0];
    
    // Generate available time slots (basic implementation)
    const availableSlots = generateTimeSlots(date, facility.operating_hours);
    
    // Filter out booked slots
    const bookedResult = await executeQuery(
      `SELECT appointment_time FROM appointments 
       WHERE facility_id = ? 
       AND appointment_date = ? 
       AND status IN ('confirmed', 'pending')`,
      [facilityId, date]
    );
    
    const bookedSlots = bookedResult.success ? bookedResult.data : [];
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
  const facilityResult = await executeQuery(
    'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?',
    [facilityId, userId]
  );
  return facilityResult.success && facilityResult.data && facilityResult.data.length > 0;
}

// Helper function to generate time slots
function generateTimeSlots(date, operatingHours) {
  // If operating_hours is null, undefined, or empty, use default hours
  if (!operatingHours || operatingHours === 'null' || operatingHours === '') {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  try {
    // Try to parse operating_hours if it's a JSON string
    let hours = operatingHours;
    if (typeof operatingHours === 'string') {
      try {
        hours = JSON.parse(operatingHours);
      } catch (parseError) {
        console.error('Error parsing operating hours JSON:', parseError);
        // Fallback to default hours
        const slots = [];
        for (let hour = 9; hour < 17; hour++) {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return slots;
      }
    }

    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check if the facility is open on this day
    if (!hours[dayName] || !hours[dayName].isOpen) {
      return []; // Facility is closed on this day
    }

    const openTime = hours[dayName].open;
    const closeTime = hours[dayName].close;

    // Parse open and close times
    const openHour = parseInt(openTime.split(':')[0]);
    const closeHour = parseInt(closeTime.split(':')[0]);

    const slots = [];
    for (let hour = openHour; hour < closeHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    return slots;
  } catch (error) {
    console.error('Error parsing operating hours:', error);
    // Fallback to default hours
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }
}

module.exports = router; 