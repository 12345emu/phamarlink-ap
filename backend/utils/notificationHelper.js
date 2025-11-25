const { executeQuery } = require('../config/database');

const VALID_NOTIFICATION_TYPES = ['appointment', 'order', 'chat', 'system', 'reminder'];

async function createNotification({ userId, type = 'system', title, message, data = null }) {
  try {
    if (!userId || !title || !message) {
      console.warn('⚠️ createNotification called with missing fields', { userId, type, title, message });
      return { success: false, message: 'Missing required notification fields' };
    }

    const normalizedType = VALID_NOTIFICATION_TYPES.includes(type) ? type : 'system';

    await executeQuery(
      `INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        data,
        is_read,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [
        userId,
        normalizedType,
        title,
        message,
        data ? JSON.stringify(data) : null,
      ]
    );

    return { success: true };
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return { success: false, message: error.message };
  }
}

async function getFacilityOwnerId(facilityId) {
  try {
    if (!facilityId) {
      return null;
    }

    const result = await executeQuery(
      'SELECT user_id FROM healthcare_facilities WHERE id = ? LIMIT 1',
      [facilityId]
    );

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0].user_id;
    }
  } catch (error) {
    console.error('❌ Error fetching facility owner ID:', error);
  }

  return null;
}

module.exports = {
  createNotification,
  getFacilityOwnerId,
};

