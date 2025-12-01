import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { notificationService } from '../services/notificationService';

export default function NotificationTester() {
  const [isLoading, setIsLoading] = useState(false);

  const testChatNotification = async () => {
    try {
      setIsLoading(true);
      
      const notificationData = notificationService.createChatNotification(
        'John Doe',
        'Hello Doctor, I have a question about my medication.',
        123
      );

      const notificationId = await notificationService.scheduleLocalNotification(notificationData, true);
      if (notificationId) {
        Alert.alert('Success', 'Chat notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send chat notification. Please check notification permissions.');
      }
    } catch (error) {
      console.error('❌ Error sending chat notification:', error);
      Alert.alert('Error', 'Failed to send chat notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testAppointmentNotification = async () => {
    try {
      setIsLoading(true);
      
      const notificationData = notificationService.createAppointmentNotification(
        'Jane Smith',
        '2024-01-15',
        '10:00 AM'
      );

      const notificationId = await notificationService.scheduleLocalNotification(notificationData, true);
      if (notificationId) {
        Alert.alert('Success', 'Appointment notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send appointment notification. Please check notification permissions.');
      }
    } catch (error) {
      console.error('❌ Error sending appointment notification:', error);
      Alert.alert('Error', 'Failed to send appointment notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testPrescriptionNotification = async () => {
    try {
      setIsLoading(true);
      
      const notificationData = notificationService.createPrescriptionNotification(
        'Mike Johnson',
        'Paracetamol'
      );

      const notificationId = await notificationService.scheduleLocalNotification(notificationData, true);
      if (notificationId) {
        Alert.alert('Success', 'Prescription notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send prescription notification. Please check notification permissions.');
      }
    } catch (error) {
      console.error('❌ Error sending prescription notification:', error);
      Alert.alert('Error', 'Failed to send prescription notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testEmergencyNotification = async () => {
    try {
      setIsLoading(true);
      
      const notificationData = notificationService.createEmergencyNotification(
        'Sarah Wilson',
        'I am experiencing severe chest pain and need immediate help!'
      );

      const notificationId = await notificationService.scheduleLocalNotification(notificationData, true);
      if (notificationId) {
        Alert.alert('Success', 'Emergency notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send emergency notification. Please check notification permissions.');
      }
    } catch (error) {
      console.error('❌ Error sending emergency notification:', error);
      Alert.alert('Error', 'Failed to send emergency notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testDelayedNotification = async () => {
    try {
      setIsLoading(true);
      
      const notificationData = {
        type: 'system' as const,
        title: 'Delayed Notification',
        body: 'This notification was scheduled 5 seconds ago',
        data: { delayed: true },
        sound: true,
        badge: 1
      };

      await notificationService.scheduleDelayedNotification(notificationData, 5);
      Alert.alert('Success', 'Delayed notification scheduled for 5 seconds!');
    } catch (error) {
      console.error('❌ Error sending delayed notification:', error);
      Alert.alert('Error', 'Failed to send delayed notification');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      setIsLoading(true);
      
      await notificationService.cancelAllNotifications();
      Alert.alert('Success', 'All notifications cleared!');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
      Alert.alert('Error', 'Failed to clear notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const TestButton = ({ 
    title, 
    description, 
    icon, 
    onPress, 
    color = '#3498db' 
  }: {
    title: string;
    description: string;
    icon: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity 
      style={[styles.testButton, { borderColor: color }]} 
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.buttonContent}>
        <FontAwesome className={icon} size={20} color={color} />
        <View style={styles.buttonText}>
          <Text style={[styles.buttonTitle, { color }]}>{title}</Text>
          <Text style={styles.buttonDescription}>{description}</Text>
        </View>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Tester</Text>
        <Text style={styles.headerSubtitle}>
          Test different types of push notifications
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chat Notifications</Text>
        
        <TestButton
          title="Chat Message"
          description="Test notification for new chat message"
          icon="comments"
          onPress={testChatNotification}
          color="#3498db"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Notifications</Text>
        
        <TestButton
          title="Appointment Request"
          description="Test notification for new appointment"
          icon="calendar"
          onPress={testAppointmentNotification}
          color="#2ecc71"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescription Notifications</Text>
        
        <TestButton
          title="Prescription Request"
          description="Test notification for prescription request"
          icon="file-text-o"
          onPress={testPrescriptionNotification}
          color="#f39c12"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Notifications</Text>
        
        <TestButton
          title="Emergency Alert"
          description="Test emergency notification"
          icon="exclamation-triangle"
          onPress={testEmergencyNotification}
          color="#e74c3c"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced Tests</Text>
        
        <TestButton
          title="Delayed Notification"
          description="Test notification with 5 second delay"
          icon="clock-o"
          onPress={testDelayedNotification}
          color="#9b59b6"
        />
        
        <TestButton
          title="Clear All Notifications"
          description="Cancel all scheduled notifications"
          icon="trash"
          onPress={clearAllNotifications}
          color="#95a5a6"
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },

  // Test Buttons
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    marginLeft: 12,
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});
