import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { notificationService } from '../services/notificationService';

interface NotificationSettings {
  chatMessages: boolean;
  appointmentRequests: boolean;
  prescriptionRequests: boolean;
  emergencyAlerts: boolean;
  systemUpdates: boolean;
  quietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export default function DoctorNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    chatMessages: true,
    appointmentRequests: true,
    prescriptionRequests: true,
    emergencyAlerts: true,
    systemUpdates: true,
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [loading, setLoading] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadSettings();
  }, []);

  const checkPermissions = async () => {
    try {
      const permissions = await notificationService.getPermissionsStatus();
      setPermissionsGranted(permissions.status === 'granted');
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
    }
  };

  const loadSettings = async () => {
    try {
      // TODO: Load from AsyncStorage or backend
      console.log('🔔 Loading notification settings...');
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      // TODO: Save to AsyncStorage and backend
      console.log('🔔 Saving notification settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Notification settings updated successfully');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const permissions = await notificationService.requestPermissions();
      
      if (permissions.status === 'granted') {
        setPermissionsGranted(true);
        Alert.alert('Success', 'Notification permissions granted');
      } else {
        Alert.alert(
          'Permissions Required',
          'Push notifications are required for this app. Please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // TODO: Open device settings
            }}
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const testNotification = async () => {
    try {
      // Check permissions first
      const permissions = await notificationService.getPermissionsStatus();
      if (permissions.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please enable notification permissions to test notifications.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enable', onPress: requestPermissions }
          ]
        );
        return;
      }

      const notificationData = {
        type: 'system' as const,
        title: 'Test Notification',
        body: 'This is a test notification from PharmaLink',
        data: { test: true },
        sound: true,
        badge: 1
      };

      // Bypass preference check for test notifications
      const notificationId = await notificationService.scheduleLocalNotification(notificationData, true);
      
      if (notificationId) {
        Alert.alert('Success', 'Test notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send test notification. Please check notification permissions.');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderSetting = (
    title: string,
    description: string,
    key: keyof NotificationSettings,
    value: boolean,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <View style={styles.settingHeader}>
          <FontAwesome name={icon as any} size={20} color="#3498db" style={styles.settingIcon} />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{title}</Text>
            <Text style={styles.settingDescription}>{description}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={(newValue) => handleSettingChange(key, newValue)}
          trackColor={{ false: '#e9ecef', true: '#3498db' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  if (!permissionsGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <FontAwesome name="bell-slash" size={48} color="#e74c3c" style={styles.permissionIcon} />
          <Text style={styles.permissionTitle}>Notifications Disabled</Text>
          <Text style={styles.permissionDescription}>
            Push notifications are required for this app to work properly. 
            Please enable them to receive important updates about your patients.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <FontAwesome name="bell" size={16} color="#fff" />
            <Text style={styles.permissionButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Text style={styles.headerSubtitle}>Manage how you receive notifications</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Communications</Text>
        
        {renderSetting(
          'Chat Messages',
          'Get notified when patients send you messages',
          'chatMessages',
          settings.chatMessages,
          'comments'
        )}
        
        {renderSetting(
          'Emergency Alerts',
          'Receive urgent notifications from patients',
          'emergencyAlerts',
          settings.emergencyAlerts,
          'exclamation-triangle'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointments & Prescriptions</Text>
        
        {renderSetting(
          'Appointment Requests',
          'Get notified about new appointment requests',
          'appointmentRequests',
          settings.appointmentRequests,
          'calendar'
        )}
        
        {renderSetting(
          'Prescription Requests',
          'Get notified about prescription requests',
          'prescriptionRequests',
          settings.prescriptionRequests,
          'file-text-o'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>
        
        {renderSetting(
          'System Updates',
          'Receive notifications about app updates and maintenance',
          'systemUpdates',
          settings.systemUpdates,
          'cog'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        
        {renderSetting(
          'Enable Quiet Hours',
          'Disable notifications during specified hours',
          'quietHours',
          settings.quietHours,
          'moon-o'
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.testButton} onPress={testNotification}>
          <FontAwesome name="bell" size={16} color="#3498db" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={saveSettings}
          disabled={loading}
        >
          <FontAwesome name="save" size={16} color="#fff" />
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to account for tab bar
  },
  
  // Permission Screen
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionIcon: {
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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

  // Settings
  settingItem: {
    marginBottom: 20,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },

  // Actions
  actions: {
    padding: 20,
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  testButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
