const { executeQuery } = require('../config/database');

class PushNotificationService {
  /**
   * Register device for push notifications
   */
  async registerDevice(deviceData) {
    try {
      console.log('🔔 PushNotificationService - Registering device:', deviceData);
      
      const { userId, userType, token, deviceId, platform } = deviceData;
      
      // Check if device already exists
      const checkQuery = 'SELECT id FROM push_tokens WHERE user_id = ? AND device_id = ?';
      const checkResult = await executeQuery(checkQuery, [userId, deviceId]);
      
      if (checkResult.success && checkResult.data.length > 0) {
        // Update existing device
        const updateQuery = `
          UPDATE push_tokens 
          SET token = ?, platform = ?, updated_at = NOW() 
          WHERE user_id = ? AND device_id = ?
        `;
        const updateResult = await executeQuery(updateQuery, [token, platform, userId, deviceId]);
        
        if (updateResult.success) {
          console.log('✅ PushNotificationService - Device updated successfully');
          return { success: true, message: 'Device updated successfully' };
        }
      } else {
        // Insert new device
        const insertQuery = `
          INSERT INTO push_tokens (user_id, user_type, token, device_id, platform, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const insertResult = await executeQuery(insertQuery, [userId, userType, token, deviceId, platform]);
        
        if (insertResult.success) {
          console.log('✅ PushNotificationService - Device registered successfully');
          return { success: true, message: 'Device registered successfully' };
        }
      }
      
      return { success: false, message: 'Failed to register device' };
    } catch (error) {
      console.error('❌ PushNotificationService - Error registering device:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Get push tokens for a user
   */
  async getUserPushTokens(userId) {
    try {
      const query = 'SELECT token, device_id, platform FROM push_tokens WHERE user_id = ? AND is_active = 1';
      const result = await executeQuery(query, [userId]);
      
      if (result.success) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('❌ PushNotificationService - Error getting user tokens:', error);
      return [];
    }
  }

  /**
   * Get push tokens for all doctors
   */
  async getAllDoctorTokens() {
    try {
      const query = `
        SELECT pt.token, pt.device_id, pt.platform, u.first_name, u.last_name, u.email
        FROM push_tokens pt
        JOIN users u ON pt.user_id = u.id
        WHERE pt.user_type = 'doctor' AND pt.is_active = 1
      `;
      const result = await executeQuery(query, []);
      
      if (result.success) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('❌ PushNotificationService - Error getting doctor tokens:', error);
      return [];
    }
  }

  /**
   * Send push notification to user
   */
  async sendNotificationToUser(userId, notificationData) {
    try {
      const tokens = await this.getUserPushTokens(userId);
      
      if (tokens.length === 0) {
        console.log('⚠️ PushNotificationService - No tokens found for user:', userId);
        return { success: false, message: 'No push tokens found for user' };
      }

      const results = [];
      for (const tokenData of tokens) {
        const result = await this.sendPushNotification(tokenData.token, notificationData);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ PushNotificationService - Sent ${successCount}/${tokens.length} notifications to user ${userId}`);
      
      return { 
        success: successCount > 0, 
        message: `Sent ${successCount}/${tokens.length} notifications`,
        results 
      };
    } catch (error) {
      console.error('❌ PushNotificationService - Error sending notification to user:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  /**
   * Send push notification to all doctors
   */
  async sendNotificationToAllDoctors(notificationData) {
    try {
      const doctorTokens = await this.getAllDoctorTokens();
      
      if (doctorTokens.length === 0) {
        console.log('⚠️ PushNotificationService - No doctor tokens found');
        return { success: false, message: 'No doctor tokens found' };
      }

      const results = [];
      for (const tokenData of doctorTokens) {
        const result = await this.sendPushNotification(tokenData.token, notificationData);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ PushNotificationService - Sent ${successCount}/${doctorTokens.length} notifications to doctors`);
      
      return { 
        success: successCount > 0, 
        message: `Sent ${successCount}/${doctorTokens.length} notifications to doctors`,
        results 
      };
    } catch (error) {
      console.error('❌ PushNotificationService - Error sending notification to doctors:', error);
      return { success: false, message: 'Failed to send notification to doctors' };
    }
  }

  /**
   * Send push notification using Expo Push API
   */
  async sendPushNotification(token, notificationData) {
    try {
      const message = {
        to: token,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
        sound: notificationData.sound !== false ? 'default' : null,
        badge: notificationData.badge || 1,
        priority: notificationData.priority || 'high',
        channelId: notificationData.channelId || 'default'
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data && result.data[0] && result.data[0].status === 'ok') {
        console.log('✅ PushNotificationService - Notification sent successfully');
        return { success: true, message: 'Notification sent successfully' };
      } else {
        console.log('❌ PushNotificationService - Failed to send notification:', result);
        return { success: false, message: 'Failed to send notification', error: result };
      }
    } catch (error) {
      console.error('❌ PushNotificationService - Error sending push notification:', error);
      return { success: false, message: 'Failed to send push notification', error: error.message };
    }
  }

  /**
   * Create notification for new chat message
   */
  createChatNotification(patientName, message, conversationId) {
    return {
      title: `New message from ${patientName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      data: {
        type: 'chat',
        conversationId,
        patientName
      },
      sound: true,
      badge: 1,
      priority: 'high'
    };
  }

  /**
   * Create notification for new appointment
   */
  createAppointmentNotification(patientName, appointmentDate, appointmentTime) {
    return {
      title: 'New Appointment Request',
      body: `${patientName} has requested an appointment for ${appointmentDate} at ${appointmentTime}`,
      data: {
        type: 'appointment',
        patientName,
        appointmentDate,
        appointmentTime
      },
      sound: true,
      badge: 1,
      priority: 'high'
    };
  }

  /**
   * Create notification for prescription request
   */
  createPrescriptionNotification(patientName, medicationName) {
    return {
      title: 'Prescription Request',
      body: `${patientName} is requesting a prescription for ${medicationName}`,
      data: {
        type: 'prescription',
        patientName,
        medicationName
      },
      sound: true,
      badge: 1,
      priority: 'high'
    };
  }

  /**
   * Create emergency notification
   */
  createEmergencyNotification(patientName, message) {
    return {
      title: '🚨 EMERGENCY ALERT',
      body: `${patientName}: ${message}`,
      data: {
        type: 'emergency',
        patientName,
        message
      },
      sound: true,
      badge: 1,
      priority: 'high'
    };
  }

  /**
   * Deactivate device token
   */
  async deactivateDeviceToken(userId, deviceId) {
    try {
      const query = 'UPDATE push_tokens SET is_active = 0, updated_at = NOW() WHERE user_id = ? AND device_id = ?';
      const result = await executeQuery(query, [userId, deviceId]);
      
      if (result.success) {
        console.log('✅ PushNotificationService - Device token deactivated');
        return { success: true, message: 'Device token deactivated' };
      }
      
      return { success: false, message: 'Failed to deactivate device token' };
    } catch (error) {
      console.error('❌ PushNotificationService - Error deactivating device token:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
}

module.exports = new PushNotificationService();
