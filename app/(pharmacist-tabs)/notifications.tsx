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
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { notificationService } from '../../services/notificationService';
import { notificationsApiService, NotificationItem } from '../../services/notificationsApiService';
import DoctorNotificationSettings from '../../components/DoctorNotificationSettings';

export default function PharmacistNotifications() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔔 Loading notifications for pharmacist...');
      const response = await notificationsApiService.getNotifications({
        page: 1,
        limit: 100,
      });

      if (response.success && response.data) {
        console.log('✅ Loaded notifications:', response.data.length);
        setNotifications(response.data);
        const unread = response.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } else {
        console.error('❌ Failed to load notifications:', response.message);
        setNotifications([]);
        setUnreadCount(0);
        // Don't show alert on initial load, only on refresh
        if (!loading) {
          Alert.alert('Error', response.message || 'Failed to load notifications');
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
      // Don't show alert on initial load, only on refresh
      if (!loading) {
        Alert.alert('Error', error.message || 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Reload notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Mark as read on backend
      const response = await notificationsApiService.markAsRead(notificationId);
      if (!response.success) {
        console.error('❌ Failed to mark notification as read:', response.message);
        // Revert optimistic update on error
        loadNotifications();
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      // Revert optimistic update on error
      loadNotifications();
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'chat':
        if (notification.data?.conversationId) {
          router.push({
            pathname: '/(pharmacist-tabs)/chat',
            params: {
              conversationId: notification.data.conversationId.toString(),
            }
          });
        } else {
          router.push('/(pharmacist-tabs)/chat');
        }
        break;
      case 'order':
        if (notification.data?.orderId) {
          router.push({
            pathname: '/(pharmacist-tabs)/orders',
            params: {
              orderId: notification.data.orderId.toString(),
            }
          });
        } else {
          router.push('/(pharmacist-tabs)/orders');
        }
        break;
      case 'appointment':
        router.push('/(pharmacist-tabs)/prescriptions');
        break;
      case 'medicine':
        // Navigate to inventory for medicine-related notifications
        if (notification.data?.medicineId) {
          router.push({
            pathname: '/(pharmacist-tabs)/medicine-details',
            params: {
              medicineId: notification.data.medicineId.toString(),
            }
          });
        } else {
          router.push('/(pharmacist-tabs)/inventory');
        }
        break;
      case 'emergency':
        Alert.alert('Emergency Alert', notification.message || 'Please handle this emergency immediately!');
        break;
      case 'system':
        // System notifications don't navigate anywhere
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chat': return 'comments';
      case 'appointment': return 'calendar';
      case 'order': return 'shopping-cart';
      case 'medicine': return 'medkit';
      case 'emergency': return 'exclamation-triangle';
      case 'system': return 'cog';
      case 'reminder': return 'bell';
      case 'staff': return 'users';
      default: return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'chat': return '#3498db';
      case 'appointment': return '#2ecc71';
      case 'order': return '#f39c12';
      case 'medicine': return '#e67e22';
      case 'emergency': return '#e74c3c';
      case 'system': return '#9b59b6';
      case 'reminder': return '#3498db';
      case 'staff': return '#16a085';
      default: return '#95a5a6';
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
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIconContainer}>
            <FontAwesome
              name={getNotificationIcon(notification.type)}
              size={20}
              color={getNotificationColor(notification.type)}
            />
          </View>
          <View style={styles.notificationText}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTimestamp}>
              {notification.timestamp}
            </Text>
          </View>
          {!notification.isRead && (
            <View style={styles.unreadDot} />
          )}
        </View>
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
                <ActivityIndicator size="large" color="#3498db" />
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
        return <DoctorNotificationSettings />;
      
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
            <FontAwesome name="arrow-left" size={20} color="#3498db" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.unreadCount}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <FontAwesome 
            name="bell" 
            size={16} 
            color={activeTab === 'notifications' ? '#3498db' : '#7f8c8d'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'notifications' && styles.activeTabText
          ]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <FontAwesome 
            name="cog" 
            size={16} 
            color={activeTab === 'settings' ? '#3498db' : '#7f8c8d'} 
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
  unreadCount: {
    fontSize: 12,
    color: '#7f8c8d',
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
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#3498db',
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
    borderLeftColor: '#3498db',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    marginTop: 4,
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
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
});
