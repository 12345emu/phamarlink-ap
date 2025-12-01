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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationSettingsService, NotificationPreferences } from '../services/notificationSettingsService';

interface NotificationSettings extends NotificationPreferences {
  // Additional UI-only settings (stored locally)
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
    
    // Category Notifications
    appointmentNotifications: true,
    orderNotifications: true,
    chatNotifications: true,
    systemNotifications: true,
    promotionNotifications: false,
    
    // Reminder Settings (UI-only, stored locally)
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
      console.log('🔍 NotificationsModal - Loading notification settings...');
      
      const response = await notificationSettingsService.getPreferences();
      
      if (response.success && response.data) {
        // Load UI-only settings from AsyncStorage
        const reminderTime = await AsyncStorage.getItem('notification_reminder_time') || '30min';
        const quietHours = await AsyncStorage.getItem('notification_quiet_hours') === 'true';
        const quietHoursStart = await AsyncStorage.getItem('notification_quiet_hours_start') || '22:00';
        const quietHoursEnd = await AsyncStorage.getItem('notification_quiet_hours_end') || '08:00';
        
        setSettings({
          ...response.data,
          reminderTime,
          quietHours,
          quietHoursStart,
          quietHoursEnd,
        });
      } else {
        // Use defaults if loading fails
        console.warn('⚠️ NotificationsModal - Using default settings');
      }
    } catch (error) {
      console.error('❌ NotificationsModal - Error loading settings:', error);
      Alert.alert('Error', 'Failed to load notification settings. Using defaults.');
    } finally {
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
      
      // Extract backend preferences (exclude UI-only settings)
      const backendPreferences: NotificationPreferences = {
        pushNotifications: settings.pushNotifications,
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        appointmentNotifications: settings.appointmentNotifications,
        orderNotifications: settings.orderNotifications,
        chatNotifications: settings.chatNotifications,
        systemNotifications: settings.systemNotifications,
        promotionNotifications: settings.promotionNotifications,
      };
      
      // Save to backend
      const response = await notificationSettingsService.updatePreferences(backendPreferences);
      
      if (response.success) {
        // Save UI-only settings to AsyncStorage
        await AsyncStorage.setItem('notification_reminder_time', settings.reminderTime);
        await AsyncStorage.setItem('notification_quiet_hours', settings.quietHours.toString());
        await AsyncStorage.setItem('notification_quiet_hours_start', settings.quietHoursStart);
        await AsyncStorage.setItem('notification_quiet_hours_end', settings.quietHoursEnd);
        
        Alert.alert('Success', response.message || 'Notification settings updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              onSettingsUpdated();
              onClose();
            }
          }
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to save notification settings. Please try again.');
      }
    } catch (error) {
      console.error('❌ NotificationsModal - Error saving settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultSettings: NotificationSettings = {
              pushNotifications: true,
              emailNotifications: true,
              smsNotifications: false,
              appointmentNotifications: true,
              orderNotifications: true,
              chatNotifications: true,
              systemNotifications: true,
              promotionNotifications: false,
              reminderTime: '30min',
              quietHours: false,
              quietHoursStart: '22:00',
              quietHoursEnd: '08:00',
            };
            
            setSettings(defaultSettings);
            
            // Also save to backend
            const backendPrefs: NotificationPreferences = {
              pushNotifications: defaultSettings.pushNotifications,
              emailNotifications: defaultSettings.emailNotifications,
              smsNotifications: defaultSettings.smsNotifications,
              appointmentNotifications: defaultSettings.appointmentNotifications,
              orderNotifications: defaultSettings.orderNotifications,
              chatNotifications: defaultSettings.chatNotifications,
              systemNotifications: defaultSettings.systemNotifications,
              promotionNotifications: defaultSettings.promotionNotifications,
            };
            
            await notificationSettingsService.updatePreferences(backendPrefs);
            await AsyncStorage.setItem('notification_reminder_time', defaultSettings.reminderTime);
            await AsyncStorage.setItem('notification_quiet_hours', defaultSettings.quietHours.toString());
            await AsyncStorage.setItem('notification_quiet_hours_start', defaultSettings.quietHoursStart);
            await AsyncStorage.setItem('notification_quiet_hours_end', defaultSettings.quietHoursEnd);
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
    color: string = '#8b7355'
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
        <View style={[styles.settingIcon, { backgroundColor: '#8b7355' + '20' }]}>
          <FontAwesome name="clock-o" size={20} color="#8b7355" />
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
          <ActivityIndicator size="large" color="#8b7355" />
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
          colors={['#8b7355', '#6b5d4f', '#5a4f3f']}
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
                '#8b7355'
              )}
              {renderToggleSetting(
                'Email Notifications',
                'Receive notifications via email',
                'emailNotifications',
                'envelope',
                '#8b7355'
              )}
              {renderToggleSetting(
                'SMS Notifications',
                'Receive notifications via SMS',
                'smsNotifications',
                'mobile',
                '#8b7355'
              )}
            </View>
          </View>

          {/* Category Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Notifications</Text>
            <View style={styles.sectionContent}>
              {renderToggleSetting(
                'Appointment Notifications',
                'Get notified about appointments, cancellations, and reschedules',
                'appointmentNotifications',
                'calendar',
                '#8b7355'
              )}
              {renderToggleSetting(
                'Order Notifications',
                'Be notified about order updates and status changes',
                'orderNotifications',
                'shopping-cart',
                '#8b7355'
              )}
              {renderToggleSetting(
                'Chat Notifications',
                'Be notified of new messages and conversations',
                'chatNotifications',
                'comments',
                '#8b7355'
              )}
              {renderToggleSetting(
                'System Notifications',
                'Be notified of system updates, maintenance, and security alerts',
                'systemNotifications',
                'cog',
                '#8b7355'
              )}
              {renderToggleSetting(
                'Promotion Notifications',
                'Receive promotional offers and special deals',
                'promotionNotifications',
                'gift',
                '#8b7355'
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
                '#8b7355'
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
    backgroundColor: '#8b7355',
    borderColor: '#8b7355',
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
