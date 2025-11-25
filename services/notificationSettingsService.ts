import { apiClient } from './apiClient';
import { API_CONFIG, API_ENDPOINTS } from '../constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BackendNotificationPreferences {
  appointment_notifications: boolean;
  order_notifications: boolean;
  chat_notifications: boolean;
  system_notifications: boolean;
  promotion_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
}

export interface NotificationPreferences {
  // General Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  
  // Category Notifications
  appointmentNotifications: boolean;
  orderNotifications: boolean;
  chatNotifications: boolean;
  systemNotifications: boolean;
  promotionNotifications: boolean;
}

const STORAGE_KEY = 'notification_preferences';

/**
 * Convert backend format to frontend format
 */
function backendToFrontend(backend: BackendNotificationPreferences): NotificationPreferences {
  return {
    pushNotifications: backend.push_notifications ?? true,
    emailNotifications: backend.email_notifications ?? true,
    smsNotifications: backend.sms_notifications ?? false,
    appointmentNotifications: backend.appointment_notifications ?? true,
    orderNotifications: backend.order_notifications ?? true,
    chatNotifications: backend.chat_notifications ?? true,
    systemNotifications: backend.system_notifications ?? true,
    promotionNotifications: backend.promotion_notifications ?? false,
  };
}

/**
 * Convert frontend format to backend format
 */
function frontendToBackend(frontend: NotificationPreferences): BackendNotificationPreferences {
  return {
    push_notifications: frontend.pushNotifications,
    email_notifications: frontend.emailNotifications,
    sms_notifications: frontend.smsNotifications,
    appointment_notifications: frontend.appointmentNotifications,
    order_notifications: frontend.orderNotifications,
    chat_notifications: frontend.chatNotifications,
    system_notifications: frontend.systemNotifications,
    promotion_notifications: frontend.promotionNotifications,
  };
}

class NotificationSettingsService {
  /**
   * Get notification preferences from backend
   */
  async getPreferences(): Promise<{ success: boolean; data?: NotificationPreferences; message?: string }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES);
      
      if (!response.success) {
        // Try to load from cache on API failure
        const cached = await this.getCachedPreferences();
        if (cached) {
          return { success: true, data: cached };
        }
        return { success: false, message: response.message || 'Failed to fetch notification preferences' };
      }
      
      // apiClient.get() returns { success: boolean, data: T }
      // Backend returns either { preferences: {...} } or direct object { appointment_notifications: true, ... }
      // The backend's actual response is in response.data
      const backendResponse = response.data;
      const backendPrefs = backendResponse?.preferences || backendResponse;
      
      if (!backendPrefs || typeof backendPrefs !== 'object') {
        // Try cache if backend response is invalid
        const cached = await this.getCachedPreferences();
        if (cached) {
          return { success: true, data: cached };
        }
        return { success: false, message: 'Invalid response format from server' };
      }
      
      const frontendPrefs = backendToFrontend(backendPrefs);
      
      // Cache in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(frontendPrefs));
      
      return { success: true, data: frontendPrefs };
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      
      // Try to load from cache
      const cached = await this.getCachedPreferences();
      if (cached) {
        return { success: true, data: cached };
      }
      
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to fetch notification preferences' 
      };
    }
  }

  /**
   * Update notification preferences on backend
   */
  async updatePreferences(
    preferences: NotificationPreferences
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const backendPrefs = frontendToBackend(preferences);
      
      const response = await apiClient.put(
        API_ENDPOINTS.NOTIFICATIONS.PREFERENCES,
        backendPrefs
      );
      
      if (response.success) {
        // Cache in AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        
        // Backend returns { message: '...' } in response.data
        const message = response.data?.message || response.message || 'Preferences updated successfully';
        return { success: true, message };
      }
      
      return { 
        success: false, 
        message: response.message || 'Failed to update preferences' 
      };
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      return { 
        success: false, 
        message: error.response?.data?.error || error.message || 'Failed to update notification preferences' 
      };
    }
  }

  /**
   * Get cached preferences (for offline use)
   */
  async getCachedPreferences(): Promise<NotificationPreferences | null> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error loading cached preferences:', error);
      return null;
    }
  }

  /**
   * Check if a specific notification type is enabled
   */
  async isNotificationEnabled(type: 'chat' | 'appointment' | 'order' | 'system' | 'promotion'): Promise<boolean> {
    try {
      const prefs = await this.getCachedPreferences();
      if (!prefs) {
        // Default to enabled if no preferences found
        return true;
      }

      switch (type) {
        case 'chat':
          return prefs.chatNotifications && prefs.pushNotifications;
        case 'appointment':
          return prefs.appointmentNotifications && prefs.pushNotifications;
        case 'order':
          return prefs.orderNotifications && prefs.pushNotifications;
        case 'system':
          return prefs.systemNotifications && prefs.pushNotifications;
        case 'promotion':
          return prefs.promotionNotifications && prefs.pushNotifications;
        default:
          return prefs.pushNotifications;
      }
    } catch (error) {
      console.error('Error checking notification preference:', error);
      // Default to enabled on error
      return true;
    }
  }
}

export const notificationSettingsService = new NotificationSettingsService();

