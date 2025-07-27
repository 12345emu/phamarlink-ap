import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppointments } from '../context/AppointmentsContext';
import { useRouter } from 'expo-router';

export default function AppointmentsHeaderButton() {
  const { appointments } = useAppointments();
  const router = useRouter();

  // Count upcoming appointments
  const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming');
  
  // Check for appointments due within 24 hours
  const dueSoonAppointments = upcomingAppointments.filter(apt => {
    const appointmentDate = new Date(apt.date);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff <= 24 && hoursDiff > 0;
  });

  const hasNotifications = dueSoonAppointments.length > 0;
  const appointmentCount = upcomingAppointments.length;

  const handlePress = () => {
    // Navigate to appointments page
    router.push('/(tabs)/appointments');
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <FontAwesome name="calendar" size={20} color="#3498db" />
      
      {/* Badge for appointment count */}
      {appointmentCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{appointmentCount}</Text>
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
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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