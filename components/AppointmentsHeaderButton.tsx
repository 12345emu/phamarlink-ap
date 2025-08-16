import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppointments } from '../context/AppointmentsContext';
import { useRouter } from 'expo-router';

/**
 * AppointmentsHeaderButton - Shows a calendar icon with a badge displaying the number of confirmed appointments
 * The badge appears in the top-right corner of the header and shows the count of confirmed appointments
 */
export default function AppointmentsHeaderButton() {
  const { appointments } = useAppointments();
  const router = useRouter();

  // Count confirmed appointments
  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');
  
  // Check for confirmed appointments due within 24 hours
  const dueSoonAppointments = confirmedAppointments.filter(apt => {
    const appointmentDate = new Date(apt.appointment_date);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff <= 24 && hoursDiff > 0;
  });

  const hasNotifications = dueSoonAppointments.length > 0;
  const appointmentCount = confirmedAppointments.length;
  
  // Debug logging
  console.log('📅 AppointmentsHeaderButton - Total appointments:', appointments.length);
  console.log('✅ Confirmed appointments:', confirmedAppointments.length);
  console.log('🔔 Due soon appointments:', dueSoonAppointments.length);

  const handlePress = () => {
    // Navigate to appointments page
    router.push('/(tabs)/appointments');
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Appointments. ${appointmentCount} confirmed appointments`}
      accessibilityHint="Tap to view your appointments"
    >
      <FontAwesome name="calendar" size={20} color="#3498db" />
      
      {/* Badge for confirmed appointment count */}
      {appointmentCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{appointmentCount > 99 ? '99+' : appointmentCount}</Text>
        </View>
      )}
      
      {/* Notification indicator for appointments due soon */}
      {hasNotifications && (
        <View style={styles.notificationDot} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f39c12',
    borderWidth: 1,
    borderColor: '#fff',
  },
}); 