import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppointments, Appointment } from '../context/AppointmentsContext';
import { appointmentsService } from '../services/appointmentsService';

const ACCENT = '#3498db';

export default function RescheduleAppointmentModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { appointments, refreshAppointments } = useAppointments();
  
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const appointmentId = Number(params.appointmentId);
  const appointment = appointments.find(apt => apt.id === appointmentId);

  useEffect(() => {
    if (appointment) {
      generateAvailableDates();
    }
  }, [appointment]);

  useEffect(() => {
    if (selectedDate && appointment) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, appointment]);

  const generateAvailableDates = () => {
    const dates: string[] = [];
    const today = new Date();
    
    // Generate dates for the next 30 days
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    setAvailableDates(dates);
  };

  const fetchAvailableSlots = async (date: string) => {
    if (!appointment) return;

    try {
      setLoading(true);
      const response = await appointmentsService.getAvailableSlots(appointment.facility_id, date);
      setAvailableSlots(response.available_slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      // Fallback slots
      setAvailableSlots([
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select both date and time');
      return;
    }

    if (!appointment) {
      Alert.alert('Error', 'Appointment not found');
      return;
    }

    try {
      setLoading(true);
      
      // Use the rescheduleAppointment method from context
      await appointmentsService.rescheduleAppointment(appointment.id, selectedDate, selectedTime);
      
      // Refresh appointments list
      await refreshAppointments();
      
      Alert.alert(
        'Appointment Rescheduled Successfully! 🎉',
        `Your appointment has been rescheduled to:\n\n📅 Date: ${new Date(selectedDate).toLocaleDateString()}\n⏰ Time: ${selectedTime}\n\nThe updated appointment will appear in your appointments list.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === dayAfterTomorrow.toDateString()) {
      return 'Day After Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!appointment) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Appointment not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ color: ACCENT, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Appointment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Appointment Info */}
        <View style={styles.currentAppointmentCard}>
          <Text style={styles.sectionTitle}>Current Appointment</Text>
          <View style={styles.appointmentInfo}>
            <Text style={styles.facilityName}>{appointment.hospitalName}</Text>
            <Text style={styles.appointmentDetails}>
              {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
            </Text>
            <Text style={styles.appointmentType}>{appointment.appointment_type}</Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
            {availableDates.map((date) => (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dateChip,
                  selectedDate === date && styles.selectedDateChip
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dateChipText,
                  selectedDate === date && styles.selectedDateChipText
                ]}>
                  {formatDate(date)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select New Time</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.loadingText}>Loading available times...</Text>
              </View>
            ) : (
              <View style={styles.timeGrid}>
                {availableSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeChip,
                      selectedTime === time && styles.selectedTimeChip
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeChipText,
                      selectedTime === time && styles.selectedTimeChipText
                    ]}>
                      {formatTime(time)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Reschedule Button */}
        {selectedDate && selectedTime && (
          <TouchableOpacity
            style={[styles.rescheduleButton, loading && styles.disabledButton]}
            onPress={handleReschedule}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="calendar-plus-o" size={16} color="#fff" />
                <Text style={styles.rescheduleButtonText}>Reschedule Appointment</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentAppointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  appointmentInfo: {
    marginTop: 8,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  appointmentDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  appointmentType: {
    fontSize: 12,
    color: ACCENT,
    textTransform: 'capitalize',
  },
  dateScrollView: {
    marginBottom: 8,
  },
  dateChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedDateChip: {
    backgroundColor: ACCENT,
  },
  dateChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  selectedDateChipText: {
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  selectedTimeChip: {
    backgroundColor: ACCENT,
  },
  timeChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  selectedTimeChipText: {
    color: '#fff',
  },
  rescheduleButton: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
  rescheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 100,
  },
}); 