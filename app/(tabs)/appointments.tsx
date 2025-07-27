import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAppointments, Appointment } from '../../context/AppointmentsContext';


const { width } = Dimensions.get('window');
const ACCENT = '#3498db';

export default function AppointmentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const router = useRouter();
  const { appointments, cancelAppointment, rescheduleAppointment } = useAppointments();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#3498db';
      case 'completed': return '#43e97b';
      case 'cancelled': return '#e74c3c';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return 'calendar';
      case 'completed': return 'check-circle';
      case 'cancelled': return 'times-circle';
      default: return 'question-circle';
    }
  };

  const filteredAppointments = appointments
    .filter(appointment => {
      const matchesSearch = appointment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || appointment.status === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleReschedule = (appointment: Appointment) => {
    Alert.alert(
      'Reschedule Appointment', 
      `Would you like to reschedule your appointment with ${appointment.doctorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reschedule', onPress: () => {
          // For now, just show a message. In a real app, this would open a date/time picker
          Alert.alert('Reschedule', 'This would open a date/time picker to select new appointment time.');
        }}
      ]
    );
  };

  const handleCancel = (appointment: Appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment with ${appointment.doctorName}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => {
          cancelAppointment(appointment.id);
          Alert.alert('Appointment Cancelled', 'Your appointment has been cancelled successfully.');
        }}
      ]
    );
  };

  const handleContactHospital = (hospitalName: string) => {
    Alert.alert('Contact Hospital', `Would contact ${hospitalName}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search appointments..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Options */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.activeFilterChipText]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterChip, activeFilter === 'upcoming' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('upcoming')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'upcoming' && styles.activeFilterChipText]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'completed' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('completed')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'completed' && styles.activeFilterChipText]}>
                Completed
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterChip, activeFilter === 'cancelled' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('cancelled')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'cancelled' && styles.activeFilterChipText]}>
                Cancelled
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Appointments List */}
      <ScrollView 
        style={styles.appointmentsList} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="calendar" size={60} color="#95a5a6" />
            <Text style={styles.emptyStateTitle}>No appointments found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || activeFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Book an appointment to see it here'}
            </Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentId}>{appointment.id}</Text>
                  <Text style={styles.appointmentDate}>{new Date(appointment.date).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                  <FontAwesome name={getStatusIcon(appointment.status) as any} size={12} color="#fff" />
                  <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                </View>
              </View>

              <View style={styles.hospitalInfo}>
                <Image source={{ uri: appointment.hospitalImage }} style={styles.hospitalImage} />
                <View style={styles.hospitalDetails}>
                  <Text style={styles.hospitalName}>{appointment.hospitalName}</Text>
                  <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                  <Text style={styles.specialty}>{appointment.specialty}</Text>
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <FontAwesome name="clock-o" size={14} color={ACCENT} />
                  <Text style={styles.detailText}>{appointment.time}</Text>
                </View>
                {appointment.notes && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="sticky-note-o" size={14} color={ACCENT} />
                    <Text style={styles.detailText}>{appointment.notes}</Text>
                  </View>
                )}
              </View>

              <View style={styles.appointmentActions}>
                {appointment.status === 'upcoming' && (
                  <>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleReschedule(appointment)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="calendar-plus-o" size={14} color={ACCENT} />
                      <Text style={styles.actionButtonText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCancel(appointment)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="times" size={14} color="#e74c3c" />
                      <Text style={[styles.actionButtonText, { color: '#e74c3c' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleContactHospital(appointment.hospitalName)}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="phone" size={14} color={ACCENT} />
                  <Text style={styles.actionButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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

  searchSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeFilterChip: {
    backgroundColor: ACCENT,
  },
  filterChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  appointmentsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  hospitalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  hospitalDetails: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 8,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
    marginLeft: 4,
  },
}); 