# Push Notifications Implementation for PharmaLink

This document describes the implementation of push notifications for doctor users in the PharmaLink mobile application.

## Overview

The push notification system allows doctors to receive real-time notifications for:
- New chat messages from patients
- Appointment requests
- Prescription requests
- Emergency alerts
- System updates

## Architecture

### Frontend (React Native/Expo)
- **NotificationService** (`services/notificationService.ts`): Core service for handling push notifications
- **NotificationInitializer** (`components/NotificationInitializer.tsx`): Component for initializing notifications
- **DoctorNotificationSettings** (`components/DoctorNotificationSettings.tsx`): Settings UI for doctors
- **NotificationTester** (`components/NotificationTester.tsx`): Testing component for notifications

### Backend (Node.js/Express)
- **PushNotificationService** (`backend/services/pushNotificationService.js`): Backend service for sending notifications
- **Push Notification Routes** (`backend/routes/push-notifications.js`): API endpoints for notification management
- **WebSocket Integration** (`backend/websocket/chatSocket.js`): Real-time notification triggers
- **Database Table** (`push_tokens`): Stores device tokens for push notifications

## Features Implemented

### 1. Device Registration
- Automatic device token registration when doctor logs in
- Support for multiple devices per user
- Platform-specific token handling (iOS/Android)

### 2. Notification Types
- **Chat Messages**: Notify doctors when patients send messages
- **Appointment Requests**: Alert doctors about new appointment requests
- **Prescription Requests**: Notify about prescription requests
- **Emergency Alerts**: High-priority notifications for urgent situations
- **System Updates**: App maintenance and update notifications

### 3. Notification Settings
- Granular control over notification types
- Quiet hours configuration
- Permission management
- Test notification functionality

### 4. Real-time Integration
- WebSocket integration for instant notifications
- Fallback to push notifications when user is offline
- Smart notification routing based on user type

## Setup Instructions

### 1. Install Dependencies
```bash
npm install expo-notifications expo-device expo-constants
```

### 2. Configure App.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default"
        }
      ]
    ]
  }
}
```

### 3. Database Setup
```bash
cd backend
node setup-push-tokens-table.js
```

### 4. Backend Configuration
The push notification routes are automatically registered in `server.js`:
```javascript
app.use('/api/push-notifications', pushNotificationRoutes);
```

## Usage

### 1. Initialize Notifications
```typescript
import { notificationService } from '../services/notificationService';

// Initialize the service
const initialized = await notificationService.initialize();

// Register device
await notificationService.registerDevice(userId, userType);
```

### 2. Send Notifications
```typescript
// Create notification data
const notificationData = notificationService.createChatNotification(
  'Patient Name',
  'Message content',
  conversationId
);

// Schedule notification
await notificationService.scheduleLocalNotification(notificationData);
```

### 3. Handle Notification Taps
```typescript
// Set up listeners
notificationService.setupNotificationListeners();

// Handle navigation based on notification data
const handleNotificationTap = (response) => {
  const data = response.notification.request.content.data;
  
  if (data.type === 'chat') {
    // Navigate to chat screen
  } else if (data.type === 'appointment') {
    // Navigate to appointment details
  }
};
```

## API Endpoints

### Register Device
```
POST /api/push-notifications/register
{
  "token": "expo-push-token",
  "deviceId": "device-id",
  "platform": "ios|android|web"
}
```

### Send Test Notification
```
POST /api/push-notifications/test
{
  "title": "Test Notification",
  "body": "This is a test notification",
  "data": {}
}
```

### Get User Devices
```
GET /api/push-notifications/devices
```

### Deactivate Device
```
DELETE /api/push-notifications/deactivate
{
  "deviceId": "device-id"
}
```

## Database Schema

### push_tokens Table
```sql
CREATE TABLE push_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_type ENUM('patient', 'doctor', 'pharmacist', 'admin') NOT NULL,
  token VARCHAR(500) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  platform ENUM('ios', 'android', 'web') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_device (user_id, device_id)
);
```

## Testing

### 1. Use NotificationTester Component
The `NotificationTester` component provides buttons to test different notification types:
- Chat message notifications
- Appointment request notifications
- Prescription request notifications
- Emergency alert notifications
- Delayed notifications

### 2. Test on Physical Device
Push notifications only work on physical devices, not simulators.

### 3. Check Console Logs
Monitor console logs for notification service status and errors.

## Troubleshooting

### Common Issues

1. **Notifications not received**
   - Check if device is physical (not simulator)
   - Verify notification permissions are granted
   - Check if push token is registered in database

2. **Permission denied**
   - Guide user to device settings to enable notifications
   - Use `notificationService.requestPermissions()` to request permissions

3. **Backend errors**
   - Check if push_tokens table exists
   - Verify database connection
   - Check server logs for errors

### Debug Steps

1. Check notification service initialization:
```typescript
const isInitialized = notificationService.isServiceInitialized();
console.log('Service initialized:', isInitialized);
```

2. Check push token:
```typescript
const token = notificationService.getPushToken();
console.log('Push token:', token);
```

3. Check permissions:
```typescript
const permissions = await notificationService.getPermissionsStatus();
console.log('Permissions:', permissions);
```

## Security Considerations

1. **Token Security**: Push tokens are stored securely and not exposed in API responses
2. **User Authorization**: Only authenticated users can register devices
3. **Device Validation**: Each device is validated before sending notifications
4. **Rate Limiting**: Implement rate limiting for notification endpoints

## Future Enhancements

1. **Rich Notifications**: Add images and action buttons to notifications
2. **Notification History**: Store notification history for users
3. **Bulk Notifications**: Send notifications to multiple users at once
4. **Analytics**: Track notification delivery and engagement
5. **Custom Sounds**: Different notification sounds for different types
6. **Notification Scheduling**: Schedule notifications for specific times

## Dependencies

### Frontend
- `expo-notifications`: Core notification functionality
- `expo-device`: Device information and capabilities
- `expo-constants`: App configuration and constants

### Backend
- `express`: Web framework
- `express-validator`: Request validation
- `mysql2`: Database connection
- `jsonwebtoken`: JWT authentication

## Support

For issues or questions regarding push notifications:
1. Check the console logs for error messages
2. Verify all dependencies are installed
3. Ensure database setup is complete
4. Test on physical device
5. Check notification permissions in device settings
