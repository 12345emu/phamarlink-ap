import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface NotificationSettings {
  // General Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  
  // Appointment Notifications
  appointmentReminders: boolean;
  appointmentCancellations: boolean;
  appointmentReschedules: boolean;
  newAppointmentRequests: boolean;
  
  // Patient Notifications
  patientMessages: boolean;
  patientPrescriptionRequests: boolean;
  patientEmergencyAlerts: boolean;
  
  // System Notifications
  systemUpdates: boolean;
  maintenanceAlerts: boolean;
  securityAlerts: boolean;
  
  // Reminder Settings
  reminderTime: string; // '15min', '30min', '1hour', '2hours', '1day'
  quietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface NotificationsSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export default function NotificationsSettingsModal({ 
  visible, 
  onClose, 
  onSettingsUpdated 
}: NotificationsSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    // General Notifications
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    
    // Appointment Notifications
    appointmentReminders: true,
    appointmentCancellations: true,
    appointmentReschedules: true,
    newAppointmentRequests: true,
    
    // Patient Notifications
    patientMessages: true,
    patientPrescriptionRequests: true,
    patientEmergencyAlerts: true,
    
    // System Notifications
    systemUpdates: true,
    maintenanceAlerts: true,
    securityAlerts: true,
    
    // Reminder Settings
    reminderTime: '30min',
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  // Load settings when modal opens
  useEffect(() => {
    if (visible) {
      loadNotificationSettings();
    }
  }, [visible]);

  const loadNotificationSettings = async () => {
    setLoading(true);
    try {
      // TODO: Load from backend/AsyncStorage
      console.log('🔍 NotificationsModal - Loading notification settings...');
      // For now, using default settings
      setLoading(false);
    } catch (error) {
      console.error('❌ NotificationsModal - Error loading settings:', error);
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      console.log('🔍 NotificationsModal - Saving notification settings:', settings);
      
      // TODO: Save to backend
      // await saveNotificationSettings(settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Notification settings updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            onSettingsUpdated();
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('❌ NotificationsModal - Error saving settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              pushNotifications: true,
              emailNotifications: true,
              smsNotifications: false,
              appointmentReminders: true,
              appointmentCancellations: true,
              appointmentReschedules: true,
              newAppointmentRequests: true,
              patientMessages: true,
              patientPrescriptionRequests: true,
              patientEmergencyAlerts: true,
              systemUpdates: true,
              maintenanceAlerts: true,
              securityAlerts: true,
              reminderTime: '30min',
              quietHours: false,
              quietHoursStart: '22:00',
              quietHoursEnd: '08:00',
            });
          }
        }
      ]
    );
  };

  const renderToggleSetting = (
    title: string,
    subtitle: string,
    key: keyof NotificationSettings,
    icon: string,
    color: string = '#3498db'
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
          <FontAwesome name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={settings[key] as boolean}
        onValueChange={(value) => handleSettingChange(key, value)}
        trackColor={{ false: '#bdc3c7', true: color + '40' }}
        thumbColor={settings[key] ? color : '#f4f3f4'}
      />
    </View>
  );

  const renderReminderTimeSelector = () => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: '#e67e22' + '20' }]}>
          <FontAwesome name="clock-o" size={20} color="#e67e22" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Reminder Time</Text>
          <Text style={styles.settingSubtitle}>How early to send appointment reminders</Text>
        </View>
      </View>
      <View style={styles.reminderTimeContainer}>
        {['15min', '30min', '1hour', '2hours', '1day'].map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.reminderTimeOption,
              settings.reminderTime === time && styles.reminderTimeOptionSelected
            ]}
            onPress={() => handleSettingChange('reminderTime', time)}
          >
            <Text style={[
              styles.reminderTimeText,
              settings.reminderTime === time && styles.reminderTimeTextSelected
            ]}>
              {time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading notification settings...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#3498db', '#2980b9']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notification Settings</Text>
            <TouchableOpacity 
              onPress={handleSaveSettings} 
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* General Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General Notifications</Text>
            <View style={styles.sectionContent}>
              {renderToggleSetting(
                'Push Notifications',
                'Receive push notifications on your device',
                'pushNotifications',
                'bell',
                '#3498db'
              )}
              {renderToggleSetting(
                'Email Notifications',
                'Receive notifications via email',
                'emailNotifications',
                'envelope',
                '#e74c3c'
              )}
              {renderToggleSetting(
                'SMS Notifications',
                'Receive notifications via SMS',
                'smsNotifications',
                'mobile',
                '#27ae60'
              )}
            </View>
          </View>

          {/* Appointment Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointment Notifications</Text>
            <View style={styles.sectionContent}>
              {renderToggleSetting(
                'Appointment Reminders',
                'Get reminded about upcoming appointments',
                'appointmentReminders',
                'calendar',
                '#9b59b6'
              )}
              {renderToggleSetting(
                'Cancellation Alerts',
                'Be notified when appointments are cancelled',
                'appointmentCancellations',
                'times-circle',
                '#e67e22'
              )}
              {renderToggleSetting(
                'Reschedule Notifications',
                'Be notified when appointments are rescheduled',
                'appointmentReschedules',
                'clock-o',
                '#f39c12'
              )}
              {renderToggleSetting(
                'New Appointment Requests',
                'Be notified of new appointment requests',
                'newAppointmentRequests',
                'plus-circle',
                '#2ecc71'
              )}
            </View>
          </View>

          {/* Patient Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Notifications</Text>
            <View style={styles.sectionContent}>
              {renderToggleSetting(
                'Patient Messages',
                'Be notified of new patient messages',
                'patientMessages',
                'comments',
                '#3498db'
              )}
              {renderToggleSetting(
                'Prescription Requests',
                'Be notified of prescription requests',
                'patientPrescriptionRequests',
                'file-text',
                '#e74c3c'
              )}
              {renderToggleSetting(
                'Emergency Alerts',
                'Be notified of patient emergency alerts',
                'patientEmergencyAlerts',
                'exclamation-triangle',
                '#e74c3c'
              )}
            </View>
          </View>

          {/* System Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Notifications</Text>
            <View style={styles.sectionContent}>
              {renderToggleSetting(
                'System Updates',
                'Be notified of system updates and new features',
                'systemUpdates',
                'cog',
                '#95a5a6'
              )}
              {renderToggleSetting(
                'Maintenance Alerts',
                'Be notified of scheduled maintenance',
                'maintenanceAlerts',
                'wrench',
                '#f39c12'
              )}
              {renderToggleSetting(
                'Security Alerts',
                'Be notified of security-related events',
                'securityAlerts',
                'shield',
                '#e74c3c'
              )}
            </View>
          </View>

          {/* Reminder Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Settings</Text>
            <View style={styles.sectionContent}>
              {renderReminderTimeSelector()}
              
              {renderToggleSetting(
                'Quiet Hours',
                'Disable notifications during specified hours',
                'quietHours',
                'moon-o',
                '#34495e'
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleResetToDefaults}
            >
              <FontAwesome name="refresh" size={16} color="#e74c3c" />
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  reminderTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderTimeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  reminderTimeOptionSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  reminderTimeText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  reminderTimeTextSelected: {
    color: '#fff',
  },
  actionButtons: {
    marginTop: 20,
    alignItems: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
    backgroundColor: '#fff',
  },
  resetButtonText: {
    color: '#e74c3c',
    marginLeft: 8,
    fontWeight: '600',
  },
});
