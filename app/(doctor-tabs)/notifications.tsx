import React, { useState, useEffect } from 'react';
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
import { notificationService } from '../../services/notificationService';
import DoctorNotificationSettings from '../../components/DoctorNotificationSettings';
import NotificationTester from '../../components/NotificationTester';

interface NotificationItem {
  id: string;
  type: 'chat' | 'appointment' | 'prescription' | 'system' | 'emergency';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}

export default function DoctorNotifications() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings' | 'test'>('notifications');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // TODO: Load actual notifications from backend
      // For now, we'll create some sample notifications
      const sampleNotifications: NotificationItem[] = [
        {
          id: '1',
          type: 'chat',
          title: 'New message from John Doe',
          message: 'Hello Doctor, I have a question about my medication.',
          timestamp: '2 minutes ago',
          isRead: false,
          data: { conversationId: 123, patientId: 456 }
        },
        {
          id: '2',
          type: 'appointment',
          title: 'Appointment Request',
          message: 'Jane Smith has requested an appointment for tomorrow at 10:00 AM',
          timestamp: '1 hour ago',
          isRead: false,
          data: { appointmentId: 789, patientId: 101 }
        },
        {
          id: '3',
          type: 'prescription',
          title: 'Prescription Request',
          message: 'Mike Johnson is requesting a prescription for Paracetamol',
          timestamp: '3 hours ago',
          isRead: true,
          data: { prescriptionId: 112, patientId: 131 }
        },
        {
          id: '4',
          type: 'emergency',
          title: '🚨 EMERGENCY ALERT',
          message: 'Sarah Wilson: I am experiencing severe chest pain and need immediate help!',
          timestamp: '5 hours ago',
          isRead: false,
          data: { emergencyId: 415, patientId: 161 }
        },
        {
          id: '5',
          type: 'system',
          title: 'System Update',
          message: 'PharmaLink has been updated to version 1.2.0 with new features',
          timestamp: '1 day ago',
          isRead: true,
          data: { updateId: 718 }
        }
      ];

      setNotifications(sampleNotifications);
      setUnreadCount(sampleNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'chat':
        router.push({
          pathname: '/patient-chat-modal',
          params: {
            patientId: notification.data?.patientId,
            conversationId: notification.data?.conversationId
          }
        });
        break;
      case 'appointment':
        router.push('/(doctor-tabs)/appointments');
        break;
      case 'prescription':
        router.push('/(doctor-tabs)/prescriptions');
        break;
      case 'emergency':
        // Navigate to emergency handling screen
        Alert.alert('Emergency Alert', 'Please handle this emergency immediately!');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chat': return 'comments';
      case 'appointment': return 'calendar';
      case 'prescription': return 'file-text-o';
      case 'emergency': return 'exclamation-triangle';
      case 'system': return 'cog';
      default: return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'chat': return '#3498db';
      case 'appointment': return '#2ecc71';
      case 'prescription': return '#f39c12';
      case 'emergency': return '#e74c3c';
      case 'system': return '#9b59b6';
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
      
      case 'test':
        return <NotificationTester />;
      
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
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'test' && styles.activeTab]}
          onPress={() => setActiveTab('test')}
        >
          <FontAwesome 
            name="flask" 
            size={16} 
            color={activeTab === 'test' ? '#3498db' : '#7f8c8d'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'test' && styles.activeTabText
          ]}>
            Test
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
