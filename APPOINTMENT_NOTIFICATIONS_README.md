# Appointment Push Notifications Implementation

This document describes the implementation of push notifications for appointment-related events in the PharmaLink application.

## Overview

The appointment notification system automatically sends push notifications to doctors and patients when appointment events occur:

- **New Appointment Creation**: Notifies the selected doctor when a patient creates an appointment
- **Appointment Status Updates**: Notifies patients when doctors update appointment status
- **Appointment Rescheduling**: Notifies both parties when appointments are rescheduled
- **Appointment Cancellation**: Notifies doctors when patients cancel appointments

## Implementation Details

### 1. Appointment Creation Notifications

**Trigger**: When a patient creates a new appointment with a preferred doctor
**Recipient**: The selected doctor
**Notification Content**:
- Title: "New Appointment Request"
- Body: "{Patient Name} has requested an appointment for {Date} at {Time}"

**Code Location**: `backend/routes/appointments.js` - POST `/` endpoint

```javascript
// Send push notification to the preferred doctor if specified
if (appointmentData.preferred_doctor) {
  const notificationData = pushNotificationService.createAppointmentNotification(
    patientName,
    appointmentData.appointment_date,
    appointmentData.appointment_time
  );
  
  await pushNotificationService.sendNotificationToUser(
    appointmentData.preferred_doctor,
    notificationData
  );
}
```

### 2. Appointment Status Update Notifications

**Trigger**: When a doctor updates appointment status (confirmed, cancelled, etc.)
**Recipient**: The patient
**Notification Types**:
- **Confirmed**: "Appointment Confirmed" - "Your appointment with Dr. {Name} has been confirmed for {Date} at {Time}"
- **Cancelled**: "Appointment Cancelled" - "Your appointment with Dr. {Name} scheduled for {Date} has been cancelled"
- **Rescheduled**: "Appointment Rescheduled" - "Your appointment with Dr. {Name} has been rescheduled to {NewDate} at {NewTime}"

**Code Location**: `backend/routes/appointments.js` - PATCH `/:id/status` endpoint

### 3. Appointment Rescheduling Notifications

**Trigger**: When a patient reschedules an appointment
**Recipient**: The doctor
**Notification Content**:
- Title: "Appointment Rescheduled"
- Body: "{Patient Name} has rescheduled their appointment to {NewDate} at {NewTime}"

**Code Location**: `backend/routes/appointments.js` - PATCH `/:id/reschedule` endpoint

### 4. Appointment Cancellation Notifications

**Trigger**: When a patient cancels an appointment
**Recipient**: The doctor
**Notification Content**:
- Title: "Appointment Cancelled"
- Body: "{Patient Name} has cancelled their appointment scheduled for {Date} at {Time}"

**Code Location**: `backend/routes/appointments.js` - PATCH `/:id/cancel` endpoint

## API Endpoints

### Production Endpoints

1. **Create Appointment** (with notification)
   ```
   POST /api/appointments
   ```
   - Automatically sends notification to selected doctor
   - Requires: `preferred_doctor` field in request body

2. **Update Appointment Status** (with notification)
   ```
   PATCH /api/appointments/:id/status
   ```
   - Automatically sends notification to patient
   - Supports: confirmed, cancelled, completed, rescheduled, no_show

3. **Reschedule Appointment** (with notification)
   ```
   PATCH /api/appointments/:id/reschedule
   ```
   - Automatically sends notification to doctor

4. **Cancel Appointment** (with notification)
   ```
   PATCH /api/appointments/:id/cancel
   ```
   - Automatically sends notification to doctor

### Test Endpoints

For testing notification functionality:

1. **Test Appointment Creation Notification**
   ```
   POST /api/test-appointment-notifications/test-appointment-creation
   Body: {
     "doctorId": 123,
     "patientName": "John Doe",
     "appointmentDate": "2024-01-15",
     "appointmentTime": "10:00"
   }
   ```

2. **Test Appointment Status Notification**
   ```
   POST /api/test-appointment-notifications/test-appointment-status
   Body: {
     "patientId": 456,
     "doctorName": "Dr. Smith",
     "appointmentDate": "2024-01-15",
     "appointmentTime": "10:00",
     "status": "confirmed"
   }
   ```

3. **Test Reschedule Notification**
   ```
   POST /api/test-appointment-notifications/test-appointment-reschedule
   Body: {
     "doctorId": 123,
     "patientName": "John Doe",
     "oldDate": "2024-01-15",
     "oldTime": "10:00",
     "newDate": "2024-01-16",
     "newTime": "14:00"
   }
   ```

4. **Test Cancellation Notification**
   ```
   POST /api/test-appointment-notifications/test-appointment-cancellation
   Body: {
     "doctorId": 123,
     "patientName": "John Doe",
     "appointmentDate": "2024-01-15",
     "appointmentTime": "10:00"
   }
   ```

## Notification Data Structure

All appointment notifications include the following data structure:

```javascript
{
  title: "Notification Title",
  body: "Notification message content",
  data: {
    type: "appointment",
    appointmentId: 123,
    status: "confirmed|cancelled|rescheduled",
    patientName: "John Doe",
    doctorName: "Dr. Smith",
    appointmentDate: "2024-01-15",
    appointmentTime: "10:00"
  },
  sound: true,
  badge: 1
}
```

## Error Handling

The notification system is designed to be non-blocking:

1. **Notification Failures**: If push notification fails, the appointment operation still succeeds
2. **Missing Data**: If patient/doctor information cannot be retrieved, notification is skipped
3. **Service Unavailable**: If push notification service is down, operations continue normally
4. **Logging**: All notification attempts are logged for debugging

## Database Requirements

The notification system requires the following database tables:

1. **push_tokens**: Stores device tokens for push notifications
2. **users**: Contains user information for notification personalization
3. **appointments**: Contains appointment data for notification context

## Testing

### Manual Testing

1. **Create Test Appointment**:
   ```bash
   curl -X POST http://localhost:3000/api/appointments \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "facility_id": 1,
       "appointment_date": "2024-01-15",
       "appointment_time": "10:00",
       "appointment_type": "consultation",
       "reason": "Regular checkup",
       "preferred_doctor": 123
     }'
   ```

2. **Test Notification Endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/test-appointment-notifications/test-appointment-creation \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "doctorId": 123,
       "patientName": "John Doe",
       "appointmentDate": "2024-01-15",
       "appointmentTime": "10:00"
     }'
   ```

### Automated Testing

The notification system can be tested using the test endpoints provided. Each test endpoint:
- Validates required parameters
- Sends a test notification
- Returns success/failure status
- Includes detailed error messages

## Configuration

### Environment Variables

No additional environment variables are required. The system uses:
- Existing database connection
- Expo Push Notification service
- JWT authentication system

### Push Notification Service

The system uses the `pushNotificationService` which:
- Handles Expo Push API integration
- Manages device token storage
- Provides notification creation methods
- Handles delivery status tracking

## Monitoring

### Logs

All notification activities are logged with the following format:
- `🔔` - Notification sending attempt
- `✅` - Successful notification delivery
- `⚠️` - Notification failure (non-critical)
- `❌` - Notification error (critical)

### Metrics

Track the following metrics:
- Notification delivery success rate
- Notification delivery time
- Failed notification reasons
- Device token registration rate

## Troubleshooting

### Common Issues

1. **No Notifications Received**
   - Check if device is registered for push notifications
   - Verify push token is stored in database
   - Check notification permissions on device

2. **Notifications Not Sent**
   - Check server logs for error messages
   - Verify push notification service is running
   - Check database connectivity

3. **Wrong Recipients**
   - Verify appointment data includes correct doctor/patient IDs
   - Check user role assignments
   - Validate appointment ownership

### Debug Steps

1. **Check Notification Service Status**:
   ```javascript
   const isInitialized = notificationService.isServiceInitialized();
   console.log('Service initialized:', isInitialized);
   ```

2. **Verify Device Registration**:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = ? AND is_active = 1;
   ```

3. **Test Notification Delivery**:
   Use the test endpoints to verify notification functionality

## Future Enhancements

1. **Rich Notifications**: Add appointment details in notification body
2. **Notification History**: Store notification delivery status
3. **Bulk Notifications**: Send notifications to multiple doctors
4. **Scheduled Notifications**: Send appointment reminders
5. **Custom Sounds**: Different notification sounds for different events
6. **Notification Templates**: Customizable notification messages
7. **Analytics**: Track notification engagement and effectiveness

## Security Considerations

1. **Token Security**: Push tokens are stored securely and not exposed in API responses
2. **User Authorization**: Only authorized users can trigger notifications
3. **Data Privacy**: Notification content is minimal and doesn't expose sensitive information
4. **Rate Limiting**: Implement rate limiting for notification endpoints
5. **Audit Logging**: Log all notification activities for security auditing

## Support

For issues related to appointment notifications:
1. Check server logs for error messages
2. Verify database connectivity and push token storage
3. Test notification delivery using test endpoints
4. Check device notification permissions
5. Verify appointment data integrity
