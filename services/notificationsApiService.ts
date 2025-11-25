import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

export interface BackendNotification {
  id: number;
  type: 'appointment' | 'order' | 'chat' | 'system' | 'reminder';
  title: string;
  message: string;
  data?: any;
  is_read: number; // 0 or 1 from database
  created_at: string;
  read_at: string | null;
  user_id?: number;
  first_name?: string;
  last_name?: string;
}

export interface NotificationItem {
  id: string;
  type: 'order' | 'appointment' | 'chat' | 'system' | 'reminder' | 'staff' | 'medicine' | 'emergency';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}

export interface NotificationsResponse {
  notifications: BackendNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Convert backend notification type to frontend type
 */
function mapNotificationType(backendType: string): NotificationItem['type'] {
  switch (backendType) {
    case 'order':
      return 'order';
    case 'appointment':
      return 'appointment';
    case 'chat':
      return 'chat';
    case 'system':
      return 'system';
    case 'reminder':
      return 'reminder';
    default:
      return 'system';
  }
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'Just now';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    
    const diffInMs = now.getTime() - date.getTime();
    
    if (diffInMs < 0) {
      return 'Just now';
    }
    
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    // For older dates, show formatted date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    return 'Just now';
  }
}

/**
 * Convert backend notification to frontend format
 */
function backendToFrontend(backend: BackendNotification): NotificationItem {
  return {
    id: backend.id.toString(),
    type: mapNotificationType(backend.type),
    title: backend.title,
    message: backend.message,
    timestamp: formatTimeAgo(backend.created_at),
    isRead: backend.is_read === 1,
    data: backend.data ? (typeof backend.data === 'string' ? JSON.parse(backend.data) : backend.data) : undefined,
  };
}

class NotificationsApiService {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    type?: string;
    read?: boolean;
  }): Promise<{ success: boolean; data?: NotificationItem[]; pagination?: any; message?: string }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.read !== undefined) queryParams.append('read', params.read.toString());

      const url = `${API_ENDPOINTS.NOTIFICATIONS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<NotificationsResponse>(url);

      // apiClient now wraps responses in { success, data } format
      // Backend returns { notifications: [...], pagination: {...} }
      // So response.data contains the backend response
      if (response.success) {
        const backendData = response.data;
        const notificationsArray = Array.isArray(backendData?.notifications)
          ? backendData.notifications
          : Array.isArray(backendData)
            ? backendData
            : [];
        const notifications = notificationsArray.map(backendToFrontend);

        return {
          success: true,
          data: notifications,
          pagination: backendData?.pagination || { page: 1, limit: 50, total: notifications.length, pages: 1 },
        };
      }

      // Error case
      console.error('Failed to fetch notifications:', {
        success: response.success,
        data: response.data,
        message: response.message,
        error: response.error,
      });

      return { 
        success: false, 
        message: response.message || response.error || 'Failed to fetch notifications' 
      };
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return {
        success: false,
        message: error.response?.data?.error || error.message || 'Failed to fetch notifications',
      };
    }
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<{ success: boolean; data?: NotificationItem; message?: string }> {
    try {
      const response = await apiClient.get<{ notification: BackendNotification }>(
        API_ENDPOINTS.NOTIFICATIONS.GET_BY_ID(id)
      );

      if (response.success && response.data) {
        const backendData = response.data;
        const notification = backendToFrontend(backendData.notification || backendData as any);
        
        return { success: true, data: notification };
      }

      return { success: false, message: 'Failed to fetch notification' };
    } catch (error: any) {
      console.error('Error fetching notification:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to fetch notification',
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.patch<{ message?: string }>(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(id));

      if (response.success) {
        return { success: true, message: response.data?.message || 'Notification marked as read' };
      }

      return { success: false, message: response.message || 'Failed to mark notification as read' };
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to mark notification as read',
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.patch<{ message?: string }>('/notifications/read-all');

      if (response.success) {
        return { success: true, message: response.data?.message || 'All notifications marked as read' };
      }

      return { success: false, message: response.message || 'Failed to mark all notifications as read' };
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to mark all notifications as read',
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.delete<{ message?: string }>(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));

      if (response.success) {
        return { success: true, message: response.data?.message || 'Notification deleted successfully' };
      }

      return { success: false, message: response.message || 'Failed to delete notification' };
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to delete notification',
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ success: boolean; count?: number; message?: string }> {
    try {
      const response = await apiClient.get<{ unread_count: number }>('/notifications/unread/count');

      if (response.success && response.data) {
        const count = response.data.unread_count || (response.data as any).unread_count || 0;
        return { success: true, count };
      }

      return { success: false, message: 'Failed to fetch unread count' };
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to fetch unread count',
      };
    }
  }
}

export const notificationsApiService = new NotificationsApiService();

