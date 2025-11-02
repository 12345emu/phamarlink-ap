import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'chat' | 'appointment' | 'prescription' | 'system' | 'emergency';
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
}

export interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
  deviceId: string;
  platform: string;
}

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 NotificationService - Initializing...');
      
      // Check if device is physical
      if (!Device.isDevice) {
        console.log('⚠️ NotificationService - Must use physical device for push notifications');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ NotificationService - Permission not granted');
        return false;
      }

      // Get push token
      const token = await this.getPushToken();
      if (!token) {
        console.log('❌ NotificationService - Failed to get push token');
        return false;
      }

      this.pushToken = token;
      this.isInitialized = true;

      console.log('✅ NotificationService - Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ NotificationService - Initialization error:', error);
      return false;
    }
  }

  /**
   * Get push token for the device
   */
  private async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      return token.data;
    } catch (error) {
      console.error('❌ NotificationService - Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(userId: number, userType: string): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.pushToken) {
        console.log('❌ NotificationService - Not initialized or no push token');
        return false;
      }

      const deviceInfo = {
        token: this.pushToken,
        type: 'expo',
        deviceId: await Device.getDeviceIdAsync(),
        platform: Platform.OS,
        userId,
        userType,
        timestamp: new Date().toISOString()
      };

      // Store device info locally
      await AsyncStorage.setItem('pushToken', this.pushToken);
      await AsyncStorage.setItem('deviceInfo', JSON.stringify(deviceInfo));

      console.log('✅ NotificationService - Device registered locally');
      return true;
    } catch (error) {
      console.error('❌ NotificationService - Error registering device:', error);
      return false;
    }
  }

  /**
   * Send device registration to backend
   */
  async registerWithBackend(userId: number, userType: string): Promise<boolean> {
    try {
      if (!this.pushToken) {
        console.log('❌ NotificationService - No push token available');
        return false;
      }

      const deviceInfo = {
        token: this.pushToken,
        type: 'expo',
        deviceId: await Device.getDeviceIdAsync(),
        platform: Platform.OS,
        userId,
        userType
      };

      // TODO: Send to backend API
      console.log('📤 NotificationService - Would send to backend:', deviceInfo);
      
      return true;
    } catch (error) {
      console.error('❌ NotificationService - Error registering with backend:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notificationData: NotificationData): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          badge: notificationData.badge,
        },
        trigger: null, // Show immediately
      });

      console.log('✅ NotificationService - Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ NotificationService - Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule a notification with delay
   */
  async scheduleDelayedNotification(
    notificationData: NotificationData, 
    delaySeconds: number
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          badge: notificationData.badge,
        },
        trigger: {
          seconds: delaySeconds,
        },
      });

      console.log('✅ NotificationService - Delayed notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ NotificationService - Error scheduling delayed notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ NotificationService - Notification cancelled:', notificationId);
      return true;
    } catch (error) {
      console.error('❌ NotificationService - Error cancelling notification:', error);
      return false;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ NotificationService - All notifications cancelled');
      return true;
    } catch (error) {
      console.error('❌ NotificationService - Error cancelling all notifications:', error);
      return false;
    }
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      return await Notifications.getPermissionsAsync();
    } catch (error) {
      console.error('❌ NotificationService - Error getting permissions:', error);
      return { status: 'undetermined' };
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      return await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.error('❌ NotificationService - Error requesting permissions:', error);
      return { status: 'denied' };
    }
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 NotificationService - Notification received:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 NotificationService - Notification tapped:', response);
      // Handle navigation based on notification data
      this.handleNotificationTap(response);
    });
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    if (data?.type === 'chat') {
      // Navigate to chat screen
      console.log('🔔 NotificationService - Navigating to chat');
    } else if (data?.type === 'appointment') {
      // Navigate to appointment details
      console.log('🔔 NotificationService - Navigating to appointment');
    } else if (data?.type === 'prescription') {
      // Navigate to prescription details
      console.log('🔔 NotificationService - Navigating to prescription');
    }
  }

  /**
   * Create notification for new chat message
   */
  createChatNotification(patientName: string, message: string, conversationId: number): NotificationData {
    return {
      type: 'chat',
      title: `New message from ${patientName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      data: {
        type: 'chat',
        conversationId,
        patientName
      },
      sound: true,
      badge: 1
    };
  }

  /**
   * Create notification for new appointment
   */
  createAppointmentNotification(patientName: string, appointmentDate: string, appointmentTime: string): NotificationData {
    return {
      type: 'appointment',
      title: 'New Appointment Request',
      body: `${patientName} has requested an appointment for ${appointmentDate} at ${appointmentTime}`,
      data: {
        type: 'appointment',
        patientName,
        appointmentDate,
        appointmentTime
      },
      sound: true,
      badge: 1
    };
  }

  /**
   * Create notification for prescription request
   */
  createPrescriptionNotification(patientName: string, medicationName: string): NotificationData {
    return {
      type: 'prescription',
      title: 'Prescription Request',
      body: `${patientName} is requesting a prescription for ${medicationName}`,
      data: {
        type: 'prescription',
        patientName,
        medicationName
      },
      sound: true,
      badge: 1
    };
  }

  /**
   * Create emergency notification
   */
  createEmergencyNotification(patientName: string, message: string): NotificationData {
    return {
      type: 'emergency',
      title: '🚨 EMERGENCY ALERT',
      body: `${patientName}: ${message}`,
      data: {
        type: 'emergency',
        patientName,
        message
      },
      sound: true,
      badge: 1
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
