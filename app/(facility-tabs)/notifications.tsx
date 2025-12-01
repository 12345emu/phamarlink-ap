import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
  AppState,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useFocusEffect } from 'expo-router';
import { notificationsApiService, NotificationItem } from '../../services/notificationsApiService';
import { notificationSettingsService, NotificationPreferences } from '../../services/notificationSettingsService';

export default function FacilityNotifications() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    appointmentNotifications: true,
    orderNotifications: true,
    chatNotifications: true,
    systemNotifications: true,
    promotionNotifications: false,
  });

  useEffect(() => {
    loadNotifications();
    if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'notifications') {
        loadNotifications();
      }
    }, [activeTab])
  );

  // Refresh notifications when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && activeTab === 'notifications') {
        loadNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      console.log('🔔 Loading notifications...');
      
      // Load all notification types - no filter to show everything
      const response = await notificationsApiService.getNotifications({
        page: 1,
        limit: 100, // Increased limit to show more notifications
      });
      
      console.log('🔔 Notifications API Response:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length || 0,
        message: response.message,
        data: response.data,
      });
      
      if (response.success && response.data) {
        // Sort notifications by date (newest first) and ensure all types are included
        const sortedNotifications = response.data.sort((a, b) => {
          // Handle timestamp comparison - timestamp might be a string like "2h ago"
          // For proper sorting, we need to use created_at if available, or parse timestamp
          try {
            // If timestamp is a relative time string, we'll sort by the notification order
            // The backend should already return them sorted by created_at DESC
            return 0; // Keep original order from backend
          } catch (error) {
            return 0;
          }
        });
        
        console.log('🔔 Processed notifications:', sortedNotifications.length);
        console.log('🔔 Notification types:', sortedNotifications.map(n => n.type));
        
        setNotifications(sortedNotifications);
        const unread = sortedNotifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } else {
        console.error('❌ Failed to load notifications:', response.message);
        console.error('❌ Response details:', JSON.stringify(response, null, 2));
        // Show empty state but don't show alert on initial load
        setNotifications([]);
        setUnreadCount(0);
        // Only show alert if we're refreshing (not initial load)
        if (notifications.length > 0) {
          Alert.alert('Error', response.message || 'Failed to load notifications');
        }
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      // Only show alert if we had notifications before (refresh scenario)
      if (notifications.length > 0) {
        Alert.alert('Error', 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      const response = await notificationsApiService.markAsRead(notification.id);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'order':
        if (notification.data?.orderId) {
          router.push(`/(facility-tabs)/orders?orderId=${notification.data.orderId}`);
        } else {
          router.push('/(facility-tabs)/orders');
        }
        break;
      case 'appointment':
        // Appointments are handled in doctor/patient context, not facility context
        // For facility admins, we can navigate to facilities or show a message
        router.push('/(facility-tabs)/facilities' as any);
        break;
      case 'chat':
        if (notification.data?.conversationId) {
          router.push({
            pathname: '/chat-screen',
            params: {
              conversationId: notification.data.conversationId.toString(),
            }
          });
        } else {
          router.push('/(facility-tabs)/chat');
        }
        break;
      case 'medicine':
      case 'reminder':
        // Medicine expiration or stock alerts - navigate to facilities management
        if (notification.data?.facilityId) {
          router.push({
            pathname: '/facility-management',
            params: {
              id: notification.data.facilityId.toString(),
              type: notification.data.facilityType || 'pharmacy',
            }
          });
        } else {
          router.push('/(facility-tabs)/facilities' as any);
        }
        break;
      case 'staff':
        // Staff-related notifications - navigate to facilities
        router.push('/(facility-tabs)/facilities' as any);
        break;
      case 'emergency':
        // Emergency notifications - show alert and navigate to relevant page
        if (notification.data?.facilityId) {
          router.push({
            pathname: '/facility-management',
            params: {
              id: notification.data.facilityId.toString(),
              type: notification.data.facilityType || 'pharmacy',
            }
          });
        } else {
          router.push('/(facility-tabs)/facilities' as any);
        }
        break;
      case 'system':
        // System notifications don't navigate
        break;
      default:
        router.push('/(facility-tabs)/facilities');
        break;
    }
  };

  const markAllAsRead = async () => {
    const response = await notificationsApiService.markAllAsRead();
    if (response.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } else {
      Alert.alert('Error', response.message || 'Failed to mark all notifications as read');
    }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await notificationSettingsService.getPreferences();
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await notificationSettingsService.updatePreferences(preferences);
      if (response.success) {
        Alert.alert('Success', response.message || 'Notification settings updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return 'shopping-cart';
      case 'appointment':
        return 'calendar';
      case 'chat':
        return 'comments';
      case 'system':
        return 'cog';
      case 'reminder':
        return 'clock-o';
      case 'promotion':
        return 'gift';
      case 'staff':
        return 'users';
      case 'medicine':
        return 'medkit';
      case 'emergency':
        return 'exclamation-triangle';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return '#3498db';
      case 'appointment':
        return '#9b59b6';
      case 'chat':
        return '#2ecc71';
      case 'system':
        return '#95a5a6';
      case 'reminder':
        return '#f39c12';
      case 'promotion':
        return '#f39c12';
      case 'staff':
        return '#9b59b6';
      case 'medicine':
        return '#e74c3c';
      case 'emergency':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const renderNotificationItem = (notification: NotificationItem) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: `${getNotificationColor(notification.type)}15` }
        ]}>
          <FontAwesome
            name={getNotificationIcon(notification.type) as any}
            size={20}
            color={getNotificationColor(notification.type)}
          />
        </View>
        <View style={styles.notificationText}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.notificationTime}>{notification.timestamp}</Text>
        </View>
        {!notification.isRead && (
          <View style={styles.unreadDot} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9b59b6" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome name="bell-slash" size={48} color="#bdc3c7" />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>
                  You're all caught up! New notifications will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {notifications.map(renderNotificationItem)}
              </View>
            )}
          </ScrollView>
        );
      
      case 'settings':
        return (
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.settingsScrollContent}
          >
            {settingsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9b59b6" />
                <Text style={styles.loadingText}>Loading settings...</Text>
              </View>
            ) : (
              <View style={styles.settingsContainer}>
                {/* General Notifications Section */}
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>General Notifications</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="bell" size={18} color="#9b59b6" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Push Notifications</Text>
                        <Text style={styles.settingDescription}>Receive push notifications on your device</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.pushNotifications}
                      onValueChange={(value) => handlePreferenceChange('pushNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.pushNotifications ? '#fff' : '#f4f3f4'}
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="envelope" size={18} color="#9b59b6" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Email Notifications</Text>
                        <Text style={styles.settingDescription}>Receive notifications via email</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.emailNotifications}
                      onValueChange={(value) => handlePreferenceChange('emailNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.emailNotifications ? '#fff' : '#f4f3f4'}
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="mobile" size={18} color="#9b59b6" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>SMS Notifications</Text>
                        <Text style={styles.settingDescription}>Receive notifications via SMS</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.smsNotifications}
                      onValueChange={(value) => handlePreferenceChange('smsNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.smsNotifications ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                </View>

                {/* Category Notifications Section */}
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Notification Categories</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="shopping-cart" size={18} color="#3498db" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Order Notifications</Text>
                        <Text style={styles.settingDescription}>New orders and order updates</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.orderNotifications}
                      onValueChange={(value) => handlePreferenceChange('orderNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.orderNotifications ? '#fff' : '#f4f3f4'}
                      disabled={!preferences.pushNotifications}
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="comments" size={18} color="#2ecc71" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Chat Notifications</Text>
                        <Text style={styles.settingDescription}>New messages and chat updates</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.chatNotifications}
                      onValueChange={(value) => handlePreferenceChange('chatNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.chatNotifications ? '#fff' : '#f4f3f4'}
                      disabled={!preferences.pushNotifications}
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="calendar" size={18} color="#9b59b6" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Appointment Notifications</Text>
                        <Text style={styles.settingDescription}>Appointment requests and updates</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.appointmentNotifications}
                      onValueChange={(value) => handlePreferenceChange('appointmentNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.appointmentNotifications ? '#fff' : '#f4f3f4'}
                      disabled={!preferences.pushNotifications}
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="cog" size={18} color="#95a5a6" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>System Notifications</Text>
                        <Text style={styles.settingDescription}>System updates and important alerts</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.systemNotifications}
                      onValueChange={(value) => handlePreferenceChange('systemNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.systemNotifications ? '#fff' : '#f4f3f4'}
                      disabled={!preferences.pushNotifications}
                    />
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <FontAwesome name="gift" size={18} color="#f39c12" />
                      <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Promotion Notifications</Text>
                        <Text style={styles.settingDescription}>Promotional offers and updates</Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.promotionNotifications}
                      onValueChange={(value) => handlePreferenceChange('promotionNotifications', value)}
                      trackColor={{ false: '#e0e0e0', true: '#9b59b6' }}
                      thumbColor={preferences.promotionNotifications ? '#fff' : '#f4f3f4'}
                      disabled={!preferences.pushNotifications}
                    />
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={saveSettings}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="check" size={16} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Settings</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <FontAwesome 
            name="bell" 
            size={16} 
            color={activeTab === 'notifications' ? '#9b59b6' : '#7f8c8d'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'notifications' && styles.activeTabText
          ]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <FontAwesome 
            name="cog" 
            size={16} 
            color={activeTab === 'settings' ? '#9b59b6' : '#7f8c8d'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'settings' && styles.activeTabText
          ]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderTabContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  markAllRead: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#9b59b6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#9b59b6',
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Content
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  
  // Notifications
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9b59b6',
    marginTop: 6,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // Settings
  settingsContainer: {
    padding: 16,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsScrollContent: {
    paddingBottom: 100, // Extra padding to account for tab bar
  },
});

