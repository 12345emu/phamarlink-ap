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
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  enabled: boolean;
}

interface DayAvailability {
  day: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilitySettings {
  // General Availability
  isAvailable: boolean;
  emergencyOnly: boolean;
  
  // Weekly Schedule
  weeklySchedule: DayAvailability[];
  
  // Special Dates
  vacationMode: boolean;
  vacationStart: string;
  vacationEnd: string;
  
  // Appointment Settings
  appointmentDuration: number; // in minutes
  bufferTime: number; // in minutes
  maxAppointmentsPerDay: number;
  
  // Consultation Types
  inPersonConsultations: boolean;
  telemedicineConsultations: boolean;
  emergencyConsultations: boolean;
  
  // Auto-booking
  allowAutoBooking: boolean;
  requireConfirmation: boolean;
}

interface AvailabilitySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export default function AvailabilitySettingsModal({ 
  visible, 
  onClose, 
  onSettingsUpdated 
}: AvailabilitySettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'settings' | 'special'>('schedule');
  
  const [settings, setSettings] = useState<AvailabilitySettings>({
    isAvailable: true,
    emergencyOnly: false,
    weeklySchedule: [
      { day: 'Monday', enabled: true, timeSlots: [{ id: '1', start: '09:00', end: '17:00', enabled: true }] },
      { day: 'Tuesday', enabled: true, timeSlots: [{ id: '2', start: '09:00', end: '17:00', enabled: true }] },
      { day: 'Wednesday', enabled: true, timeSlots: [{ id: '3', start: '09:00', end: '17:00', enabled: true }] },
      { day: 'Thursday', enabled: true, timeSlots: [{ id: '4', start: '09:00', end: '17:00', enabled: true }] },
      { day: 'Friday', enabled: true, timeSlots: [{ id: '5', start: '09:00', end: '17:00', enabled: true }] },
      { day: 'Saturday', enabled: false, timeSlots: [{ id: '6', start: '10:00', end: '14:00', enabled: false }] },
      { day: 'Sunday', enabled: false, timeSlots: [{ id: '7', start: '10:00', end: '14:00', enabled: false }] },
    ],
    vacationMode: false,
    vacationStart: '',
    vacationEnd: '',
    appointmentDuration: 30,
    bufferTime: 15,
    maxAppointmentsPerDay: 20,
    inPersonConsultations: true,
    telemedicineConsultations: true,
    emergencyConsultations: true,
    allowAutoBooking: false,
    requireConfirmation: true,
  });

  // Load settings when modal opens
  useEffect(() => {
    if (visible) {
      loadAvailabilitySettings();
    }
  }, [visible]);

  const loadAvailabilitySettings = async () => {
    setLoading(true);
    try {
      // TODO: Load from backend/AsyncStorage
      console.log('🔍 AvailabilityModal - Loading availability settings...');
      // For now, using default settings
      setLoading(false);
    } catch (error) {
      console.error('❌ AvailabilityModal - Error loading settings:', error);
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof AvailabilitySettings, value: boolean | number | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDayToggle = (dayIndex: number) => {
    setSettings(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex ? { ...day, enabled: !day.enabled } : day
      )
    }));
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      start: '09:00',
      end: '17:00',
      enabled: true
    };
    
    setSettings(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex 
          ? { ...day, timeSlots: [...day.timeSlots, newSlot] }
          : day
      )
    }));
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSettings(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex 
          ? { ...day, timeSlots: day.timeSlots.filter((_, slotIdx) => slotIdx !== slotIndex) }
          : day
      )
    }));
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    setSettings(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex 
          ? { 
              ...day, 
              timeSlots: day.timeSlots.map((slot, slotIdx) => 
                slotIdx === slotIndex ? { ...slot, [field]: value } : slot
              )
            }
          : day
      )
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      console.log('🔍 AvailabilityModal - Saving availability settings:', settings);
      
      // TODO: Save to backend
      // await saveAvailabilitySettings(settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Availability settings updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            onSettingsUpdated();
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('❌ AvailabilityModal - Error saving settings:', error);
      Alert.alert('Error', 'Failed to save availability settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderToggleSetting = (
    title: string,
    subtitle: string,
    key: keyof AvailabilitySettings,
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

  const renderNumberInput = (
    title: string,
    subtitle: string,
    key: keyof AvailabilitySettings,
    icon: string,
    color: string = '#3498db',
    min: number = 0,
    max: number = 100
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
      <TextInput
        style={styles.numberInput}
        value={settings[key].toString()}
        onChangeText={(value) => {
          const numValue = parseInt(value) || 0;
          if (numValue >= min && numValue <= max) {
            handleSettingChange(key, numValue);
          }
        }}
        keyboardType="numeric"
        placeholder="0"
      />
    </View>
  );

  const renderDaySchedule = (day: DayAvailability, dayIndex: number) => (
    <View key={day.day} style={styles.dayContainer}>
      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <Switch
            value={day.enabled}
            onValueChange={() => handleDayToggle(dayIndex)}
            trackColor={{ false: '#bdc3c7', true: '#3498db' }}
            thumbColor={day.enabled ? '#3498db' : '#f4f3f4'}
          />
          <Text style={[styles.dayTitle, !day.enabled && styles.disabledText]}>
            {day.day}
          </Text>
        </View>
        {day.enabled && (
          <TouchableOpacity
            style={styles.addSlotButton}
            onPress={() => addTimeSlot(dayIndex)}
          >
            <FontAwesome name="plus" size={16} color="#3498db" />
          </TouchableOpacity>
        )}
      </View>
      
      {day.enabled && (
        <View style={styles.timeSlotsContainer}>
          {day.timeSlots.map((slot, slotIndex) => (
            <View key={slot.id} style={styles.timeSlot}>
              <View style={styles.timeInputs}>
                <TextInput
                  style={styles.timeInput}
                  value={slot.start}
                  onChangeText={(value) => updateTimeSlot(dayIndex, slotIndex, 'start', value)}
                  placeholder="09:00"
                />
                <Text style={styles.timeSeparator}>to</Text>
                <TextInput
                  style={styles.timeInput}
                  value={slot.end}
                  onChangeText={(value) => updateTimeSlot(dayIndex, slotIndex, 'end', value)}
                  placeholder="17:00"
                />
              </View>
              {day.timeSlots.length > 1 && (
                <TouchableOpacity
                  style={styles.removeSlotButton}
                  onPress={() => removeTimeSlot(dayIndex, slotIndex)}
                >
                  <FontAwesome name="times" size={16} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading availability settings...</Text>
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
            <Text style={styles.headerTitle}>Availability Settings</Text>
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

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
            onPress={() => setActiveTab('schedule')}
          >
            <FontAwesome name="calendar" size={16} color={activeTab === 'schedule' ? '#3498db' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
              Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
          >
            <FontAwesome name="cog" size={16} color={activeTab === 'settings' ? '#3498db' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
              Settings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'special' && styles.activeTab]}
            onPress={() => setActiveTab('special')}
          >
            <FontAwesome name="star" size={16} color={activeTab === 'special' ? '#3498db' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === 'special' && styles.activeTabText]}>
              Special
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'schedule' && (
            <View>
              <Text style={styles.sectionTitle}>Weekly Schedule</Text>
              <View style={styles.sectionContent}>
                {settings.weeklySchedule.map((day, index) => renderDaySchedule(day, index))}
              </View>
            </View>
          )}

          {activeTab === 'settings' && (
            <View>
              <Text style={styles.sectionTitle}>Appointment Settings</Text>
              <View style={styles.sectionContent}>
                {renderNumberInput(
                  'Appointment Duration',
                  'Duration of each appointment in minutes',
                  'appointmentDuration',
                  'clock-o',
                  '#3498db',
                  15,
                  120
                )}
                {renderNumberInput(
                  'Buffer Time',
                  'Time between appointments in minutes',
                  'bufferTime',
                  'pause',
                  '#e67e22',
                  0,
                  60
                )}
                {renderNumberInput(
                  'Max Appointments',
                  'Maximum appointments per day',
                  'maxAppointmentsPerDay',
                  'users',
                  '#2ecc71',
                  1,
                  50
                )}
              </View>

              <Text style={styles.sectionTitle}>Consultation Types</Text>
              <View style={styles.sectionContent}>
                {renderToggleSetting(
                  'In-Person Consultations',
                  'Allow face-to-face appointments',
                  'inPersonConsultations',
                  'user-md',
                  '#3498db'
                )}
                {renderToggleSetting(
                  'Telemedicine Consultations',
                  'Allow video/phone consultations',
                  'telemedicineConsultations',
                  'video-camera',
                  '#9b59b6'
                )}
                {renderToggleSetting(
                  'Emergency Consultations',
                  'Allow emergency appointments',
                  'emergencyConsultations',
                  'exclamation-triangle',
                  '#e74c3c'
                )}
              </View>

              <Text style={styles.sectionTitle}>Booking Settings</Text>
              <View style={styles.sectionContent}>
                {renderToggleSetting(
                  'Allow Auto-Booking',
                  'Allow patients to book directly',
                  'allowAutoBooking',
                  'calendar-plus-o',
                  '#27ae60'
                )}
                {renderToggleSetting(
                  'Require Confirmation',
                  'Require manual confirmation for bookings',
                  'requireConfirmation',
                  'check-circle',
                  '#f39c12'
                )}
              </View>
            </View>
          )}

          {activeTab === 'special' && (
            <View>
              <Text style={styles.sectionTitle}>Special Availability</Text>
              <View style={styles.sectionContent}>
                {renderToggleSetting(
                  'Emergency Only',
                  'Only available for emergency cases',
                  'emergencyOnly',
                  'ambulance',
                  '#e74c3c'
                )}
                {renderToggleSetting(
                  'Vacation Mode',
                  'Temporarily unavailable',
                  'vacationMode',
                  'plane',
                  '#95a5a6'
                )}
              </View>

              {settings.vacationMode && (
                <View style={styles.vacationContainer}>
                  <Text style={styles.vacationTitle}>Vacation Period</Text>
                  <View style={styles.dateInputs}>
                    <View style={styles.dateInput}>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <TextInput
                        style={styles.dateTextInput}
                        value={settings.vacationStart}
                        onChangeText={(value) => handleSettingChange('vacationStart', value)}
                        placeholder="YYYY-MM-DD"
                      />
                    </View>
                    <View style={styles.dateInput}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <TextInput
                        style={styles.dateTextInput}
                        value={settings.vacationEnd}
                        onChangeText={(value) => handleSettingChange('vacationEnd', value)}
                        placeholder="YYYY-MM-DD"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    marginTop: 20,
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
  numberInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    color: '#2c3e50',
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  disabledText: {
    color: '#bdc3c7',
  },
  addSlotButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotsContainer: {
    marginTop: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    color: '#2c3e50',
  },
  timeSeparator: {
    marginHorizontal: 8,
    fontSize: 14,
    color: '#7f8c8d',
  },
  removeSlotButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  vacationContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  vacationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 12,
  },
  dateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  dateTextInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#f39c12',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
});
