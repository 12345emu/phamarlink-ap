const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const { sendAppointmentConfirmationEmail } = require('../utils/emailService');

const router = express.Router();

// Get doctor dashboard stats - SIMPLE VERSION
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Doctor Dashboard - Getting stats for user:', req.user.id);
    
    // Get total appointments count for this doctor only
    const doctorId = req.user.id;
    console.log('🔍 Doctor Dashboard - Getting total stats for doctor ID:', doctorId);
    
    const appointmentsQuery = 'SELECT COUNT(*) as total FROM appointments WHERE preferred_doctor = ?';
    const appointmentsResult = await executeQuery(appointmentsQuery, [doctorId]);
    
    // Get unique patients count from this doctor's appointments (all time)
    const patientsQuery = 'SELECT COUNT(DISTINCT user_id) as total FROM appointments WHERE preferred_doctor = ?';
    const patientsResult = await executeQuery(patientsQuery, [doctorId]);
    
    // Get pending prescriptions count from prescriptions table
    const prescriptionsQuery = `
      SELECT COUNT(*) as total 
      FROM prescriptions 
      WHERE doctor_id = ? AND status = 'active'
    `;
    const prescriptionsResult = await executeQuery(prescriptionsQuery, [doctorId]);
    
    // Get unread messages count from chat_messages table
    const messagesQuery = `
      SELECT COUNT(*) as total 
      FROM chat_messages cm
      JOIN chat_conversations cc ON cm.conversation_id = cc.id
      WHERE cc.professional_id = ? AND cm.is_read = 0 AND cm.sender_id != ?
    `;
    const messagesResult = await executeQuery(messagesQuery, [doctorId, doctorId]);
    
    const stats = {
      todayAppointments: appointmentsResult.success ? appointmentsResult.data[0].total : 0,
      totalPatients: patientsResult.success ? patientsResult.data[0].total : 0,
      pendingPrescriptions: prescriptionsResult.success ? prescriptionsResult.data[0].total : 0,
      unreadMessages: messagesResult.success ? messagesResult.data[0].total : 0
    };
    
    console.log('✅ Doctor Dashboard - Stats calculated:', stats);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Doctor Dashboard - Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard stats'
    });
  }
});

// Get doctor appointments - SIMPLE VERSION
router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Doctor Dashboard - Getting appointments for user:', req.user.id);
    
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get appointments where this doctor is the preferred doctor
    const doctorId = req.user.id;
    console.log('🔍 Doctor Dashboard - Getting appointments for doctor ID:', doctorId);
    
    const appointmentsQuery = `
      SELECT 
        a.id, a.user_id, a.facility_id, a.appointment_date, a.appointment_time,
        a.appointment_type, a.reason, a.symptoms, a.status, a.created_at,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as facility_name, hf.address as facility_address
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      WHERE a.preferred_doctor = ?
      ORDER BY a.appointment_date DESC, a.appointment_time ASC
      LIMIT ? OFFSET ?
    `;
    
    // Get total count for this doctor's appointments
    const countQuery = 'SELECT COUNT(*) as total FROM appointments WHERE preferred_doctor = ?';
    
    const appointmentsResult = await executeQuery(appointmentsQuery, [doctorId, parseInt(limit), offset]);
    const countResult = await executeQuery(countQuery, [doctorId]);
    
    if (!appointmentsResult.success || !countResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    const total = countResult.data[0].total;
    
    res.json({
      success: true,
      data: {
        appointments: appointmentsResult.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Doctor Dashboard - Error getting appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting appointments'
    });
  }
});

// Get doctor dashboard data - COMPLETE VERSION
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Doctor Dashboard - Getting complete dashboard data for user:', req.user.id);
    
    // Get stats for this doctor only
    const doctorId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    console.log('🔍 Doctor Dashboard - Getting complete dashboard stats for doctor ID:', doctorId, 'Date:', today);
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM appointments WHERE preferred_doctor = ?) as totalAppointments,
        (SELECT COUNT(DISTINCT user_id) FROM appointments WHERE preferred_doctor = ?) as totalPatients,
        (SELECT COUNT(*) FROM prescriptions WHERE doctor_id = ? AND status = 'active') as pendingPrescriptions,
        (SELECT COUNT(*) FROM chat_messages cm JOIN chat_conversations cc ON cm.conversation_id = cc.id WHERE cc.professional_id = ? AND cm.is_read = 0 AND cm.sender_id != ?) as unreadMessages
    `;
    
    const statsResult = await executeQuery(statsQuery, [doctorId, doctorId, doctorId, doctorId, doctorId]);
    
    // Get today's appointments for this doctor only
    const appointmentsQuery = `
      SELECT 
        a.id, a.user_id, a.facility_id, a.appointment_date, a.appointment_time,
        a.appointment_type, a.reason, a.status, a.created_at,
        u.first_name, u.last_name, u.email,
        hf.name as facility_name
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      WHERE a.preferred_doctor = ? AND DATE(a.appointment_date) = ?
      ORDER BY a.appointment_time ASC
      LIMIT 5
    `;
    
    const appointmentsResult = await executeQuery(appointmentsQuery, [doctorId, today]);
    
    if (!statsResult.success || !appointmentsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    const stats = statsResult.data[0];
    const dashboardData = {
      stats: {
        todayAppointments: stats.totalAppointments,
        totalPatients: stats.totalPatients,
        pendingPrescriptions: stats.pendingPrescriptions,
        unreadMessages: stats.unreadMessages
      },
      upcomingAppointments: appointmentsResult.data,
      recentPatients: appointmentsResult.data.slice(0, 3), // First 3 as recent patients
      recentPrescriptions: [] // Empty for now
    };
    
    console.log('✅ Doctor Dashboard - Complete data:', dashboardData);
    
    res.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error) {
    console.error('❌ Doctor Dashboard - Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard data'
    });
  }
});

// Update appointment status
router.put('/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;
    const doctorId = req.user.id;
    
    console.log('🔍 Doctor Dashboard - Updating appointment status:', {
      appointmentId,
      status,
      doctorId
    });
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, confirmed, cancelled, completed'
      });
    }
    
    // Check if appointment belongs to this doctor
    const checkQuery = 'SELECT id, preferred_doctor FROM appointments WHERE id = ?';
    const checkResult = await executeQuery(checkQuery, [appointmentId]);
    
    if (!checkResult.success || checkResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    if (checkResult.data[0].preferred_doctor !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this appointment'
      });
    }
    
    // Update appointment status
    const updateQuery = 'UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, [status, appointmentId]);
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update appointment status'
      });
    }
    
    console.log('✅ Doctor Dashboard - Appointment status updated successfully');
    
    // Send confirmation email if status is 'confirmed'
    if (status === 'confirmed') {
      try {
        // Get appointment details for email
        const appointmentDetailsQuery = `
          SELECT 
            a.appointment_date, a.appointment_time, a.appointment_type, a.reason,
            u.first_name, u.last_name, u.email,
            d.first_name as doctor_first_name, d.last_name as doctor_last_name,
            hf.name as facility_name, hf.address as facility_address
          FROM appointments a
          JOIN users u ON a.user_id = u.id
          JOIN users d ON a.preferred_doctor = d.id
          JOIN healthcare_facilities hf ON a.facility_id = hf.id
          WHERE a.id = ?
        `;
        
        const appointmentDetails = await executeQuery(appointmentDetailsQuery, [appointmentId]);
        
        if (appointmentDetails.success && appointmentDetails.data.length > 0) {
          const appointment = appointmentDetails.data[0];
          
          // Send confirmation email
          const emailSent = await sendAppointmentConfirmationEmail(
            appointment.email,
            `${appointment.first_name} ${appointment.last_name}`,
            `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}`,
            appointment.appointment_date,
            appointment.appointment_time,
            appointment.appointment_type,
            appointment.facility_name,
            appointment.facility_address
          );
          
          if (emailSent) {
            console.log('✅ Doctor Dashboard - Confirmation email sent successfully');
          } else {
            console.log('⚠️ Doctor Dashboard - Failed to send confirmation email');
          }
        } else {
          console.log('⚠️ Doctor Dashboard - Could not fetch appointment details for email');
        }
      } catch (emailError) {
        console.error('❌ Doctor Dashboard - Error sending confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      data: {
        appointmentId: parseInt(appointmentId),
        status: status
      }
    });
    
  } catch (error) {
    console.error('❌ Doctor Dashboard - Error updating appointment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start consultation
router.post('/appointments/:id/start-consultation', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const doctorId = req.user.id;
    
    console.log('🔍 Doctor Dashboard - Starting consultation:', {
      appointmentId,
      doctorId
    });
    
    // Check if appointment exists and belongs to this doctor
    const checkQuery = `
      SELECT a.id, a.user_id, a.preferred_doctor, a.status, a.appointment_date, a.appointment_time,
             u.first_name, u.last_name, u.email, u.phone
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ? AND a.preferred_doctor = ?
    `;
    const checkResult = await executeQuery(checkQuery, [appointmentId, doctorId]);
    
    if (!checkResult.success || checkResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or you are not authorized to start this consultation'
      });
    }
    
    const appointment = checkResult.data[0];
    
    // Check if appointment is confirmed
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed appointments can start consultation'
      });
    }
    
    // Update appointment status to 'in_progress'
    const updateQuery = 'UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, ['in_progress', appointmentId]);
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to start consultation'
      });
    }
    
    console.log('✅ Doctor Dashboard - Consultation started successfully');
    res.json({
      success: true,
      message: 'Consultation started successfully',
      data: {
        appointmentId: parseInt(appointmentId),
        status: 'in_progress',
        patient: {
          id: appointment.user_id,
          name: `${appointment.first_name} ${appointment.last_name}`,
          email: appointment.email,
          phone: appointment.phone
        },
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time
      }
    });
    
  } catch (error) {
    console.error('❌ Doctor Dashboard - Error starting consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get doctor's patients
router.get('/patients', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { limit = 20, page = 1, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    // Build search condition
    let searchCondition = '';
    let searchParams = [];
    if (search) {
      searchCondition = 'AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }

    // Build status condition
    let statusCondition = '';
    if (status === 'active') {
      statusCondition = 'AND a.status IN ("confirmed", "in_progress", "completed")';
    } else if (status === 'inactive') {
      statusCondition = 'AND a.status IN ("cancelled", "pending")';
    }


    // Get patients with their latest appointment info
    const patientsQuery = `
      SELECT DISTINCT
        u.id as patient_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.created_at as patient_since,
        MAX(a.appointment_date) as last_visit,
        MAX(CASE WHEN a.status = 'confirmed' AND a.appointment_date > CURDATE() THEN a.appointment_date END) as next_appointment,
        COUNT(a.id) as total_appointments,
        MAX(a.status) as latest_status
      FROM users u
      JOIN appointments a ON u.id = a.user_id
      WHERE a.preferred_doctor = ? ${searchCondition} ${statusCondition}
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.created_at
      ORDER BY last_visit DESC
      LIMIT ? OFFSET ?
    `;

    const patientsResult = await executeQuery(patientsQuery, [doctorId, ...searchParams, parseInt(limit), offset]);
    
    // Extract the actual data from the result
    const patientsData = patientsResult.success ? patientsResult.data : patientsResult;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN appointments a ON u.id = a.user_id
      WHERE a.preferred_doctor = ? ${searchCondition} ${statusCondition}
    `;
    const countResult = await executeQuery(countQuery, [doctorId, ...searchParams]);
    
    // Extract the actual count data from the result
    const countData = countResult.success ? countResult.data : countResult;

    // Format the response
    const patients = Array.isArray(patientsData) ? patientsData.map(patient => ({
      id: patient.patient_id,
      name: `${patient.first_name} ${patient.last_name}`,
      email: patient.email,
      phone: patient.phone,
      lastVisit: patient.last_visit ? new Date(patient.last_visit).toISOString().split('T')[0] : null,
      nextAppointment: patient.next_appointment ? new Date(patient.next_appointment).toISOString().split('T')[0] : null,
      totalAppointments: patient.total_appointments,
      status: patient.latest_status === 'cancelled' || patient.latest_status === 'pending' ? 'inactive' : 'active',
      patientSince: patient.patient_since
    })) : [];


    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          total: countData && countData[0] ? countData[0].total : 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: countData && countData[0] ? Math.ceil(countData[0].total / limit) : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: error.message
    });
  }
});

// Get patient history
router.get('/patients/:patientId/history', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientId = req.params.patientId;
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔍 Doctor Dashboard - Getting patient history:', { doctorId, patientId });

    // Verify the patient has appointments with this doctor
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM appointments a
      WHERE a.user_id = ? AND a.preferred_doctor = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [patientId, doctorId]);
    
    if (!verifyResult.success || verifyResult.data[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or no appointments with this doctor'
      });
    }

    // Get patient basic info
    const patientQuery = `
      SELECT id, first_name, last_name, email, phone, created_at
      FROM users
      WHERE id = ?
    `;
    const patientResult = await executeQuery(patientQuery, [patientId]);
    const patient = patientResult.success ? patientResult.data[0] : null;

    // Get patient profile from patient_profile table
    let profile = null;
    
    try {
      const profileQuery = `
        SELECT 
          emergency_contact, emergency_contact_name, insurance_provider, insurance_number,
          blood_type, allergies, medical_history, address, city, state, country, postal_code
        FROM patient_profiles
        WHERE user_id = ?
      `;
      const profileResult = await executeQuery(profileQuery, [patientId]);
      console.log('🔍 Doctor Dashboard - Profile query result:', profileResult);
      
      // Handle the case where executeQuery returns data directly or wrapped
      if (profileResult.success && profileResult.data && profileResult.data.length > 0) {
        profile = profileResult.data[0];
      } else if (Array.isArray(profileResult) && profileResult.length > 0) {
        profile = profileResult[0];
      }
      
      console.log('🔍 Doctor Dashboard - Final profile:', profile);
    } catch (error) {
      console.log('⚠️ Patient profile table query failed:', error.message);
      
      // Fallback: try to get profile data from users table
      try {
        const fallbackQuery = `
          SELECT 
            emergency_contact, blood_type, address, city, state, country
          FROM users
          WHERE id = ?
        `;
        const fallbackResult = await executeQuery(fallbackQuery, [patientId]);
        console.log('🔍 Doctor Dashboard - Fallback query result:', fallbackResult);
        
        if (fallbackResult.success && fallbackResult.data && fallbackResult.data.length > 0) {
          const userData = fallbackResult.data[0];
          profile = {
            emergency_contact: userData.emergency_contact,
            emergency_contact_name: null,
            insurance_provider: null,
            insurance_number: null,
            blood_type: userData.blood_type,
            allergies: [],
            medical_history: [],
            address: userData.address,
            city: userData.city,
            state: userData.state,
            country: userData.country,
            postal_code: null
          };
          console.log('🔍 Doctor Dashboard - Fallback profile created:', profile);
        }
      } catch (fallbackError) {
        console.log('⚠️ Fallback query also failed:', fallbackError.message);
      }
    }

    // Get appointment history
    const appointmentsQuery = `
      SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type,
        a.reason,
        a.symptoms,
        a.status,
        a.notes,
        a.created_at,
        hf.name as facility_name,
        hf.address as facility_address
      FROM appointments a
      JOIN healthcare_facilities hf ON a.facility_id = hf.id
      WHERE a.user_id = ? AND a.preferred_doctor = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT ? OFFSET ?
    `;
    const appointmentsResult = await executeQuery(appointmentsQuery, [patientId, doctorId, parseInt(limit), offset]);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      WHERE a.user_id = ? AND a.preferred_doctor = ?

      `;
    const countResult = await executeQuery(countQuery, [patientId, doctorId]);

    // Format appointments
    const appointments = appointmentsResult.success ? appointmentsResult.data.map(apt => ({
      id: apt.id,
      date: apt.appointment_date,
      time: apt.appointment_time,
      type: apt.appointment_type,
      reason: apt.reason,
        symptoms: apt.symptoms ? (() => {
          try {
            if (typeof apt.symptoms === 'string' && apt.symptoms.startsWith('[')) {
              return JSON.parse(apt.symptoms);
            } else {
              return [apt.symptoms];
            }
          } catch (error) {
            console.log('⚠️ Error parsing symptoms:', apt.symptoms, error.message);
            return [apt.symptoms];
          }
        })() : [],
      status: apt.status,
      notes: apt.notes,
      createdAt: apt.created_at,
      facility: {
        name: apt.facility_name,
        address: apt.facility_address
      }
    })) : [];

    // Get prescription history (if prescriptions table exists)
    let prescriptions = [];
    try {
      const prescriptionsQuery = `
        SELECT 
          p.id,
          p.medication_name,
          p.dosage,
          p.frequency,
          p.duration,
          p.instructions,
          p.created_at,
          p.status
        FROM prescriptions p
        WHERE p.patient_id = ? AND p.doctor_id = ?
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
      const prescriptionsResult = await executeQuery(prescriptionsQuery, [patientId, doctorId]);
      prescriptions = prescriptionsResult.success ? prescriptionsResult.data : [];
    } catch (error) {
      console.log('⚠️ Prescriptions table not found, skipping prescription history');
      prescriptions = [];
    }

    console.log('✅ Doctor Dashboard - Patient history fetched successfully');

    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          email: patient.email,
          phone: patient.phone,
          patientSince: patient.created_at,
        profile: profile ? {
          emergencyContact: profile.emergency_contact,
          emergencyContactName: profile.emergency_contact_name,
          insuranceProvider: profile.insurance_provider,
          insuranceNumber: profile.insurance_number,
          bloodType: profile.blood_type,
          allergies: profile.allergies ? (() => {
            try {
              if (typeof profile.allergies === 'string' && profile.allergies.startsWith('[')) {
                return JSON.parse(profile.allergies);
              } else {
                return profile.allergies.split(',').map(item => item.trim());
              }
            } catch (error) {
              console.log('⚠️ Error parsing allergies:', profile.allergies, error.message);
              return [profile.allergies];
            }
          })() : [],
          medicalHistory: profile.medical_history ? (() => {
            try {
              if (typeof profile.medical_history === 'string' && profile.medical_history.startsWith('[')) {
                return JSON.parse(profile.medical_history);
              } else {
                return [profile.medical_history];
              }
            } catch (error) {
              console.log('⚠️ Error parsing medical_history:', profile.medical_history, error.message);
              return [profile.medical_history];
            }
          })() : [],
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          postalCode: profile.postal_code
        } : null
        },
        appointments: {
          data: appointments,
          pagination: {
            total: countResult.success ? countResult.data[0].total : 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil((countResult.success ? countResult.data[0].total : 0) / limit)
          }
        },
        prescriptions: prescriptions
      }
    });

    } catch (error) {
      console.error('❌ Doctor Dashboard - Error fetching patient history:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patient history',
        error: error.message
      });
    }

});

// ===== PRESCRIPTION ENDPOINTS =====

/**
 * Create a new prescription
 */
router.post('/prescriptions', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { 
      patientId, 
      appointmentId, 
      medicationName, 
      dosage, 
      frequency, 
      duration, 
      instructions, 
      quantity = 1, 
      refills = 0 
    } = req.body;

    console.log('🔍 Doctor Dashboard - Creating prescription:', { doctorId, patientId, appointmentId });

    // Validate required fields
    if (!patientId || !medicationName || !dosage || !frequency || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, medicationName, dosage, frequency, duration'
      });
    }

    // Verify the patient has appointments with this doctor
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM appointments a
      WHERE a.user_id = ? AND a.preferred_doctor = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [patientId, doctorId]);
    
    if (!verifyResult.success || verifyResult.data[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or no appointments with this doctor'
      });
    }

    // Create prescription
    const insertQuery = `
      INSERT INTO prescriptions (
        patient_id, doctor_id, appointment_id, medication_name, dosage, 
        frequency, duration, instructions, quantity, refills, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;
    
    const insertResult = await executeQuery(insertQuery, [
      patientId, doctorId, appointmentId || null, medicationName, dosage, 
      frequency, duration, instructions, quantity, refills
    ]);

    if (insertResult.success) {
      console.log('✅ Doctor Dashboard - Prescription created successfully');
      res.json({
        success: true,
        message: 'Prescription created successfully',
        data: {
          id: insertResult.data.insertId,
          patientId,
          doctorId,
          appointmentId,
          medicationName,
          dosage,
          frequency,
          duration,
          instructions,
          quantity,
          refills,
          status: 'active'
        }
      });
    } else {
      throw new Error('Failed to create prescription');
    }

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prescription',
      error: error.message
    });
  }
});

/**
 * Get prescriptions for a patient
 */
router.get('/prescriptions/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientId = req.params.patientId;
    const { limit = 20, page = 1, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔍 Doctor Dashboard - Getting prescriptions for patient:', { doctorId, patientId });

    // Verify the patient has appointments with this doctor
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM appointments a
      WHERE a.user_id = ? AND a.preferred_doctor = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [patientId, doctorId]);
    
    if (!verifyResult.success || verifyResult.data[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or no appointments with this doctor'
      });
    }

    // Build status filter
    let statusCondition = '';
    if (status !== 'all') {
      statusCondition = 'AND p.status = ?';
    }

    // Get prescriptions
    const prescriptionsQuery = `
      SELECT 
        p.id, p.patient_id, p.doctor_id, p.appointment_id, p.medication_name,
        p.dosage, p.frequency, p.duration, p.instructions, p.quantity, p.refills,
        p.status, p.created_at, p.updated_at,
        u.first_name, u.last_name, u.email as patient_email,
        a.appointment_date, a.appointment_time, a.appointment_type
      FROM prescriptions p
      JOIN users u ON p.patient_id = u.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.patient_id = ? AND p.doctor_id = ? ${statusCondition}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = status !== 'all' 
      ? [patientId, doctorId, status, parseInt(limit), offset]
      : [patientId, doctorId, parseInt(limit), offset];

    const prescriptionsResult = await executeQuery(prescriptionsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM prescriptions p
      WHERE p.patient_id = ? AND p.doctor_id = ? ${statusCondition}
    `;
    const countParams = status !== 'all' ? [patientId, doctorId, status] : [patientId, doctorId];
    const countResult = await executeQuery(countQuery, countParams);

    const prescriptions = prescriptionsResult.success ? prescriptionsResult.data.map(prescription => ({
      id: prescription.id,
      patientId: prescription.patient_id,
      doctorId: prescription.doctor_id,
      appointmentId: prescription.appointment_id,
      medicationName: prescription.medication_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      instructions: prescription.instructions,
      quantity: prescription.quantity,
      refills: prescription.refills,
      status: prescription.status,
      createdAt: prescription.created_at,
      updatedAt: prescription.updated_at,
      patient: {
        name: `${prescription.first_name} ${prescription.last_name}`,
        email: prescription.patient_email
      },
      appointment: prescription.appointment_date ? {
        date: prescription.appointment_date,
        time: prescription.appointment_time,
        type: prescription.appointment_type
      } : null
    })) : [];

    res.json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          total: countResult.success ? countResult.data[0].total : 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((countResult.success ? countResult.data[0].total : 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
});

/**
 * Update prescription status
 */
router.put('/prescriptions/:id/status', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const prescriptionId = req.params.id;
    const { status } = req.body;

    console.log('🔍 Doctor Dashboard - Updating prescription status:', { doctorId, prescriptionId, status });

    // Validate status
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, completed, or cancelled'
      });
    }

    // Verify prescription belongs to this doctor
    const verifyQuery = 'SELECT id FROM prescriptions WHERE id = ? AND doctor_id = ?';
    const verifyResult = await executeQuery(verifyQuery, [prescriptionId, doctorId]);
    
    if (!verifyResult.success || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found or access denied'
      });
    }

    // Update prescription status
    const updateQuery = 'UPDATE prescriptions SET status = ?, updated_at = NOW() WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, [status, prescriptionId]);

    if (updateResult.success) {
      console.log('✅ Doctor Dashboard - Prescription status updated successfully');
      res.json({
        success: true,
        message: 'Prescription status updated successfully',
        data: {
          id: prescriptionId,
          status
        }
      });
    } else {
      throw new Error('Failed to update prescription status');
    }

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error updating prescription status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prescription status',
      error: error.message
    });
  }
});

/**
 * Get all prescriptions for the doctor
 */
router.get('/prescriptions', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { limit = 20, page = 1, status = 'all', search = '' } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔍 Doctor Dashboard - Getting all prescriptions:', { doctorId, status, search });

    // Build filters
    let statusCondition = '';
    let searchCondition = '';
    let queryParams = [doctorId];

    if (status !== 'all') {
      statusCondition = 'AND p.status = ?';
      queryParams.push(status);
    }

    if (search) {
      searchCondition = 'AND (p.medication_name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get prescriptions
    const prescriptionsQuery = `
      SELECT 
        p.id, p.patient_id, p.doctor_id, p.appointment_id, p.medication_name,
        p.dosage, p.frequency, p.duration, p.instructions, p.quantity, p.refills,
        p.status, p.created_at, p.updated_at,
        u.first_name, u.last_name, u.email as patient_email,
        a.appointment_date, a.appointment_time, a.appointment_type
      FROM prescriptions p
      JOIN users u ON p.patient_id = u.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE p.doctor_id = ? ${statusCondition} ${searchCondition}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const prescriptionsResult = await executeQuery(prescriptionsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM prescriptions p
      JOIN users u ON p.patient_id = u.id
      WHERE p.doctor_id = ? ${statusCondition} ${searchCondition}
    `;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await executeQuery(countQuery, countParams);

    const prescriptions = prescriptionsResult.success ? prescriptionsResult.data.map(prescription => ({
      id: prescription.id,
      patientId: prescription.patient_id,
      doctorId: prescription.doctor_id,
      appointmentId: prescription.appointment_id,
      medicationName: prescription.medication_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      instructions: prescription.instructions,
      quantity: prescription.quantity,
      refills: prescription.refills,
      status: prescription.status,
      createdAt: prescription.created_at,
      updatedAt: prescription.updated_at,
      patient: {
        name: `${prescription.first_name} ${prescription.last_name}`,
        email: prescription.patient_email
      },
      appointment: prescription.appointment_date ? {
        date: prescription.appointment_date,
        time: prescription.appointment_time,
        type: prescription.appointment_type
      } : null
    })) : [];

    res.json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          total: countResult.success ? countResult.data[0].total : 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((countResult.success ? countResult.data[0].total : 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
});

// Add medical notes for a patient
router.post('/medical-notes', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { 
      patientId, 
      appointmentId, 
      diagnosis, 
      symptoms, 
      treatment, 
      medications, 
      notes, 
      followUpDate, 
      followUpNotes 
    } = req.body;

    if (!patientId || !diagnosis || !symptoms || !treatment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, diagnosis, symptoms, treatment'
      });
    }

    // Verify the patient has appointments with this doctor
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM appointments a
      WHERE a.user_id = ? AND a.preferred_doctor = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [patientId, doctorId]);
    
    if (!verifyResult.success || verifyResult.data[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or no appointments with this doctor'
      });
    }

    const insertQuery = `
      INSERT INTO medical_notes (
        patient_id, doctor_id, appointment_id, diagnosis, symptoms, 
        treatment, medications, notes, follow_up_date, follow_up_notes, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const insertResult = await executeQuery(insertQuery, [
      patientId, doctorId, appointmentId || null, diagnosis, symptoms, 
      treatment, medications || '', notes || '', followUpDate || null, followUpNotes || ''
    ]);

    console.log('🔍 Medical notes insert result:', JSON.stringify(insertResult, null, 2));
    console.log('🔍 Insert result keys:', Object.keys(insertResult));
    console.log('🔍 Insert result data keys:', insertResult.data ? Object.keys(insertResult.data) : 'No data property');
    console.log('🔍 Insert result insertId:', insertResult.insertId);
    console.log('🔍 Insert result data.insertId:', insertResult.data ? insertResult.data.insertId : 'No data property');

    if (insertResult.success) {
      // Try multiple ways to get the insertId
      const insertId = insertResult.insertId || insertResult.data?.insertId || insertResult.data?.insertid || 1;
      console.log('✅ Medical notes inserted with ID:', insertId);
      
      res.json({
        success: true,
        message: 'Medical notes added successfully',
        data: {
          id: insertId,
          patientId,
          doctorId,
          appointmentId,
          diagnosis,
          symptoms,
          treatment,
          medications,
          notes,
          followUpDate,
          followUpNotes,
          createdAt: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Insert failed:', insertResult.error);
      throw new Error('Failed to add medical notes');
    }

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error adding medical notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add medical notes',
      error: error.message
    });
  }
});

// Get medical notes for a patient
router.get('/medical-notes/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientId = req.params.patientId;
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    // Verify the patient has appointments with this doctor
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM appointments a
      WHERE a.user_id = ? AND a.preferred_doctor = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [patientId, doctorId]);
    
    if (!verifyResult.success || verifyResult.data[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found or no appointments with this doctor'
      });
    }

    const notesQuery = `
      SELECT 
        mn.id,
        mn.diagnosis,
        mn.symptoms,
        mn.treatment,
        mn.medications,
        mn.notes,
        mn.follow_up_date,
        mn.follow_up_notes,
        mn.created_at,
        mn.updated_at,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type
      FROM medical_notes mn
      LEFT JOIN appointments a ON mn.appointment_id = a.id
      WHERE mn.patient_id = ? AND mn.doctor_id = ?
      ORDER BY mn.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const notesResult = await executeQuery(notesQuery, [patientId, doctorId, parseInt(limit), offset]);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM medical_notes
      WHERE patient_id = ? AND doctor_id = ?
    `;
    const countResult = await executeQuery(countQuery, [patientId, doctorId]);

    const notes = notesResult.success ? notesResult.data.map(note => ({
      id: note.id,
      diagnosis: note.diagnosis,
      symptoms: note.symptoms,
      treatment: note.treatment,
      medications: note.medications,
      notes: note.notes,
      followUpDate: note.follow_up_date,
      followUpNotes: note.follow_up_notes,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      appointment: note.appointment_date ? {
        date: note.appointment_date,
        time: note.appointment_time,
        type: note.appointment_type
      } : null
    })) : [];

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          total: countResult.success ? countResult.data[0].total : 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((countResult.success ? countResult.data[0].total : 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error fetching medical notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical notes',
      error: error.message
    });
  }
});

// Update medical note
router.put('/medical-notes/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const noteId = req.params.id;
    const { 
      diagnosis, 
      symptoms, 
      treatment, 
      medications, 
      notes, 
      followUpDate, 
      followUpNotes 
    } = req.body;

    // Verify the note belongs to this doctor
    const verifyQuery = `
      SELECT id FROM medical_notes 
      WHERE id = ? AND doctor_id = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [noteId, doctorId]);
    
    if (!verifyResult.success || !verifyResult.data || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical note not found or access denied'
      });
    }

    const updateQuery = `
      UPDATE medical_notes SET 
        diagnosis = ?, symptoms = ?, treatment = ?, medications = ?, 
        notes = ?, follow_up_date = ?, follow_up_notes = ?, updated_at = NOW()
      WHERE id = ? AND doctor_id = ?
    `;
    
    const updateResult = await executeQuery(updateQuery, [
      diagnosis, symptoms, treatment, medications, notes, 
      followUpDate, followUpNotes, noteId, doctorId
    ]);

    if (updateResult.success) {
      res.json({
        success: true,
        message: 'Medical note updated successfully',
        data: {
          id: noteId,
          diagnosis,
          symptoms,
          treatment,
          medications,
          notes,
          followUpDate,
          followUpNotes,
          updatedAt: new Date().toISOString()
        }
      });
    } else {
      throw new Error('Failed to update medical note');
    }

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error updating medical note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medical note',
      error: error.message
    });
  }
});

// Delete medical note
router.delete('/medical-notes/:id', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const noteId = req.params.id;

    // Verify the note belongs to this doctor
    const verifyQuery = `
      SELECT id FROM medical_notes 
      WHERE id = ? AND doctor_id = ?
    `;
    const verifyResult = await executeQuery(verifyQuery, [noteId, doctorId]);
    
    if (!verifyResult.success || !verifyResult.data || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical note not found or access denied'
      });
    }

    const deleteQuery = `
      DELETE FROM medical_notes 
      WHERE id = ? AND doctor_id = ?
    `;
    
    const deleteResult = await executeQuery(deleteQuery, [noteId, doctorId]);

    if (deleteResult.success) {
      res.json({
        success: true,
        message: 'Medical note deleted successfully'
      });
    } else {
      throw new Error('Failed to delete medical note');
    }

  } catch (error) {
    console.error('❌ Doctor Dashboard - Error deleting medical note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medical note',
      error: error.message
    });
  }
});

// Get recent activities for doctor dashboard
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { limit = 10 } = req.query;
    
    console.log('🔍 Doctor Dashboard - Getting recent activities for doctor:', doctorId);
    
    // Get recent appointments
    const appointmentsQuery = `
      SELECT 
        'appointment' as type,
        a.id,
        a.status,
        a.created_at,
        a.updated_at,
        u.first_name,
        u.last_name,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.preferred_doctor = ?
      ORDER BY a.updated_at DESC
      LIMIT ?
    `;
    
    // Get recent prescriptions
    const prescriptionsQuery = `
      SELECT 
        'prescription' as type,
        p.id,
        p.status,
        p.created_at,
        p.updated_at,
        u.first_name,
        u.last_name,
        p.medication_name,
        p.dosage
      FROM prescriptions p
      JOIN users u ON p.patient_id = u.id
      WHERE p.doctor_id = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    
    // Get recent medical notes
    const medicalNotesQuery = `
      SELECT 
        'medical_note' as type,
        mn.id,
        mn.created_at,
        u.first_name,
        u.last_name,
        mn.diagnosis
      FROM medical_notes mn
      JOIN users u ON mn.patient_id = u.id
      WHERE mn.doctor_id = ?
      ORDER BY mn.created_at DESC
      LIMIT ?
    `;
    
    const [appointmentsResult, prescriptionsResult, medicalNotesResult] = await Promise.all([
      executeQuery(appointmentsQuery, [doctorId, limit]),
      executeQuery(prescriptionsQuery, [doctorId, limit]),
      executeQuery(medicalNotesQuery, [doctorId, limit])
    ]);
    
    const activities = [];
    
    // Process appointments
    if (appointmentsResult.success && appointmentsResult.data) {
      appointmentsResult.data.forEach(apt => {
        activities.push({
          id: `apt_${apt.id}`,
          type: 'appointment',
          icon: 'calendar',
          color: apt.status === 'confirmed' ? '#2ecc71' : apt.status === 'pending' ? '#f39c12' : '#95a5a6',
          text: `Appointment ${apt.status} with ${apt.first_name} ${apt.last_name}`,
          timestamp: apt.updated_at,
          details: {
            date: apt.appointment_date,
            time: apt.appointment_time,
            type: apt.appointment_type
          }
        });
      });
    }
    
    // Process prescriptions
    if (prescriptionsResult.success && prescriptionsResult.data) {
      prescriptionsResult.data.forEach(pres => {
        activities.push({
          id: `pres_${pres.id}`,
          type: 'prescription',
          icon: 'file-text-o',
          color: pres.status === 'active' ? '#3498db' : '#95a5a6',
          text: `Prescription created for ${pres.first_name} ${pres.last_name}`,
          timestamp: pres.created_at,
          details: {
            medication: pres.medication_name,
            dosage: pres.dosage
          }
        });
      });
    }
    
    // Process medical notes
    if (medicalNotesResult.success && medicalNotesResult.data) {
      medicalNotesResult.data.forEach(note => {
        activities.push({
          id: `note_${note.id}`,
          type: 'medical_note',
          icon: 'stethoscope',
          color: '#9b59b6',
          text: `Medical note added for ${note.first_name} ${note.last_name}`,
          timestamp: note.created_at,
          details: {
            diagnosis: note.diagnosis
          }
        });
      });
    }
    
    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to requested number
    const limitedActivities = activities.slice(0, parseInt(limit));
    
    console.log('✅ Doctor Dashboard - Recent activities fetched:', limitedActivities.length);
    
    res.json({
      success: true,
      data: {
        activities: limitedActivities,
        total: activities.length
      }
    });
    
  } catch (error) {
    console.error('❌ Doctor Dashboard - Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities'
    });
  }
});

module.exports = router;
