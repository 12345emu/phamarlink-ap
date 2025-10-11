import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

interface Appointment {
  id: number;
  patientName: string;
  patientEmail: string;
  date: string;
  time: string;
  type: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export default function DoctorAppointments() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'pending' | 'confirmed'>('all');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    // TODO: Replace with actual API call
    const mockAppointments: Appointment[] = [
      {
        id: 1,
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        date: '2024-01-15',
        time: '09:00 AM',
        type: 'Consultation',
        status: 'confirmed',
        notes: 'Regular check-up',
      },
      {
        id: 2,
        patientName: 'Jane Smith',
        patientEmail: 'jane@example.com',
        date: '2024-01-15',
        time: '10:30 AM',
        type: 'Follow-up',
        status: 'pending',
        notes: 'Post-surgery follow-up',
      },
      {
        id: 3,
        patientName: 'Mike Johnson',
        patientEmail: 'mike@example.com',
        date: '2024-01-15',
        time: '02:00 PM',
        type: 'Check-up',
        status: 'confirmed',
      },
      {
        id: 4,
        patientName: 'Sarah Wilson',
        patientEmail: 'sarah@example.com',
        date: '2024-01-16',
        time: '11:00 AM',
        type: 'Consultation',
        status: 'pending',
      },
    ];
    setAppointments(mockAppointments);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const filteredAppointments = appointments.filter(appointment => {
    switch (selectedFilter) {
      case 'today':
        return appointment.date === '2024-01-15'; // Today's date
      case 'pending':
        return appointment.status === 'pending';
      case 'confirmed':
        return appointment.status === 'confirmed';
      default:
        return true;
    }
  });

  const handleAppointmentAction = (appointmentId: number, action: 'confirm' | 'cancel') => {
    Alert.alert(
      action === 'confirm' ? 'Confirm Appointment' : 'Cancel Appointment',
      `Are you sure you want to ${action} this appointment?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            // TODO: Implement API call
            setAppointments(prev => prev.map(apt => 
              apt.id === appointmentId 
                ? { ...apt, status: action === 'confirm' ? 'confirmed' : 'cancelled' }
                : apt
            ));
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#2ecc71';
      case 'pending': return '#f39c12';
      case 'completed': return '#3498db';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.activeFilterButton
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.key && styles.activeFilterText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.appointmentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="calendar-o" size={60} color="#bdc3c7" />
            <Text style={styles.emptyText}>No appointments found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'You have no appointments scheduled'
                : `No ${selectedFilter} appointments found`
              }
            </Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{appointment.patientName}</Text>
                  <Text style={styles.patientEmail}>{appointment.patientEmail}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(appointment.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <FontAwesome name="calendar" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="clock-o" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="stethoscope" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.type}</Text>
                </View>
              </View>

              {appointment.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{appointment.notes}</Text>
                </View>
              )}

              {appointment.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleAppointmentAction(appointment.id, 'confirm')}
                  >
                    <FontAwesome name="check" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleAppointmentAction(appointment.id, 'cancel')}
                  >
                    <FontAwesome name="times" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {appointment.status === 'confirmed' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={() => {
                      // TODO: Navigate to consultation screen
                      Alert.alert('Start Consultation', 'This will open the consultation interface');
                    }}
                  >
                    <FontAwesome name="play" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Start Consultation</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ecf0f1',
  },
  activeFilterButton: {
    backgroundColor: '#3498db',
  },
  filterText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  appointmentsList: {
    flex: 1,
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 8,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  startButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 5,
  },
});
