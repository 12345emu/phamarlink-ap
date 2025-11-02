const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pushNotificationService = require('../services/pushNotificationService');

const router = express.Router();

// Test appointment notification to doctor
router.post('/test-appointment-creation', authenticateToken, async (req, res) => {
  try {
    const { doctorId, patientName, appointmentDate, appointmentTime } = req.body;
    
    if (!doctorId || !patientName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: doctorId, patientName, appointmentDate, appointmentTime'
      });
    }

    console.log('🔔 Test - Sending appointment creation notification to doctor:', doctorId);
    
    // Create appointment notification
    const notificationData = pushNotificationService.createAppointmentNotification(
      patientName,
      appointmentDate,
      appointmentTime
    );
    
    // Send notification to the doctor
    const result = await pushNotificationService.sendNotificationToUser(doctorId, notificationData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test appointment notification sent successfully',
        data: {
          doctorId,
          patientName,
          appointmentDate,
          appointmentTime,
          notificationResult: result
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error sending test appointment notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test appointment status notification to patient
router.post('/test-appointment-status', authenticateToken, async (req, res) => {
  try {
    const { patientId, doctorName, appointmentDate, appointmentTime, status } = req.body;
    
    if (!patientId || !doctorName || !appointmentDate || !appointmentTime || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, doctorName, appointmentDate, appointmentTime, status'
      });
    }

    console.log('🔔 Test - Sending appointment status notification to patient:', patientId);
    
    // Create status notification based on the status
    let notificationData;
    switch (status) {
      case 'confirmed':
        notificationData = {
          title: 'Appointment Confirmed',
          body: `Your appointment with ${doctorName} has been confirmed for ${appointmentDate} at ${appointmentTime}`,
          data: {
            type: 'appointment',
            status: 'confirmed',
            doctorName
          },
          sound: true,
          badge: 1
        };
        break;
      case 'cancelled':
        notificationData = {
          title: 'Appointment Cancelled',
          body: `Your appointment with ${doctorName} scheduled for ${appointmentDate} has been cancelled`,
          data: {
            type: 'appointment',
            status: 'cancelled',
            doctorName
          },
          sound: true,
          badge: 1
        };
        break;
      case 'rescheduled':
        notificationData = {
          title: 'Appointment Rescheduled',
          body: `Your appointment with ${doctorName} has been rescheduled to ${appointmentDate} at ${appointmentTime}`,
          data: {
            type: 'appointment',
            status: 'rescheduled',
            doctorName
          },
          sound: true,
          badge: 1
        };
        break;
      default:
        notificationData = {
          title: 'Appointment Update',
          body: `Your appointment with ${doctorName} status has been updated to ${status}`,
          data: {
            type: 'appointment',
            status: status,
            doctorName
          },
          sound: true,
          badge: 1
        };
    }
    
    // Send notification to the patient
    const result = await pushNotificationService.sendNotificationToUser(patientId, notificationData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test appointment status notification sent successfully',
        data: {
          patientId,
          doctorName,
          appointmentDate,
          appointmentTime,
          status,
          notificationResult: result
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test status notification',
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error sending test appointment status notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test reschedule notification to doctor
router.post('/test-appointment-reschedule', authenticateToken, async (req, res) => {
  try {
    const { doctorId, patientName, oldDate, oldTime, newDate, newTime } = req.body;
    
    if (!doctorId || !patientName || !oldDate || !oldTime || !newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: doctorId, patientName, oldDate, oldTime, newDate, newTime'
      });
    }

    console.log('🔔 Test - Sending appointment reschedule notification to doctor:', doctorId);
    
    // Create reschedule notification
    const notificationData = {
      title: 'Appointment Rescheduled',
      body: `${patientName} has rescheduled their appointment from ${oldDate} ${oldTime} to ${newDate} at ${newTime}`,
      data: {
        type: 'appointment',
        status: 'rescheduled',
        patientName,
        oldDate,
        oldTime,
        newDate,
        newTime
      },
      sound: true,
      badge: 1
    };
    
    // Send notification to the doctor
    const result = await pushNotificationService.sendNotificationToUser(doctorId, notificationData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test appointment reschedule notification sent successfully',
        data: {
          doctorId,
          patientName,
          oldDate,
          oldTime,
          newDate,
          newTime,
          notificationResult: result
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test reschedule notification',
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error sending test appointment reschedule notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test cancellation notification to doctor
router.post('/test-appointment-cancellation', authenticateToken, async (req, res) => {
  try {
    const { doctorId, patientName, appointmentDate, appointmentTime } = req.body;
    
    if (!doctorId || !patientName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: doctorId, patientName, appointmentDate, appointmentTime'
      });
    }

    console.log('🔔 Test - Sending appointment cancellation notification to doctor:', doctorId);
    
    // Create cancellation notification
    const notificationData = {
      title: 'Appointment Cancelled',
      body: `${patientName} has cancelled their appointment scheduled for ${appointmentDate} at ${appointmentTime}`,
      data: {
        type: 'appointment',
        status: 'cancelled',
        patientName,
        appointmentDate,
        appointmentTime
      },
      sound: true,
      badge: 1
    };
    
    // Send notification to the doctor
    const result = await pushNotificationService.sendNotificationToUser(doctorId, notificationData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test appointment cancellation notification sent successfully',
        data: {
          doctorId,
          patientName,
          appointmentDate,
          appointmentTime,
          notificationResult: result
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test cancellation notification',
        error: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error sending test appointment cancellation notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
