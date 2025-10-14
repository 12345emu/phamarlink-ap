import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { doctorDashboardService } from '../../services/doctorDashboardService';

interface Appointment {
  id: number;
  user_id: number;
  facility_id: number;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  reason: string;
  symptoms: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress';
  notes?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  facility_name: string;
  facility_address: string;
  created_at: string;
}

export default function DoctorAppointments() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'pending' | 'confirmed' | 'in_progress' | 'completed'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 DoctorAppointments - Loading appointments from API...');
      
      const appointmentsData = await doctorDashboardService.getAppointments(100, 1);
      console.log('🔍 DoctorAppointments - API Response:', JSON.stringify(appointmentsData, null, 2));
      console.log('🔍 DoctorAppointments - Sample appointment dates:', appointmentsData.slice(0, 3).map(apt => ({
        id: apt.id,
        date: apt.appointment_date,
        time: apt.appointment_time
      })));
      
      setAppointments(appointmentsData);
      console.log('✅ DoctorAppointments - Appointments loaded:', appointmentsData.length);
    } catch (error) {
      console.error('❌ DoctorAppointments - Error loading appointments:', error);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const filteredAppointments = appointments.filter(appointment => {
    const today = new Date().toISOString().split('T')[0];
    
    // More robust date comparison
    const appointmentDate = new Date(appointment.appointment_date);
    const todayDate = new Date(today);
    const isToday = appointmentDate.toDateString() === todayDate.toDateString();
    
    console.log('🔍 Filtering appointment:', {
      appointmentDate: appointment.appointment_date,
      parsedAppointmentDate: appointmentDate.toDateString(),
      today: today,
      parsedToday: todayDate.toDateString(),
      selectedFilter: selectedFilter,
      isToday: isToday,
      stringMatch: appointment.appointment_date === today
    });
    
    switch (selectedFilter) {
      case 'today':
        return isToday;
      case 'pending':
        return appointment.status === 'pending';
      case 'confirmed':
        return appointment.status === 'confirmed';
      case 'in_progress':
        return appointment.status === 'in_progress';
      case 'completed':
        return appointment.status === 'completed';
      default:
        return true;
    }
  });

  const handleStartConsultation = async (appointmentId: number) => {
    Alert.alert(
      'Start Consultation',
      'Are you ready to start the consultation with this patient?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Consultation',
          onPress: async () => {
            try {
              console.log(`🔍 DoctorAppointments - Starting consultation for appointment ${appointmentId}`);
              
              const consultationData = await doctorDashboardService.startConsultation(appointmentId);
              
              // Update the local state
              setAppointments(prevAppointments => 
                prevAppointments.map(apt => 
                  apt.id === appointmentId 
                    ? { ...apt, status: 'in_progress' }
                    : apt
                )
              );
              
              Alert.alert(
                'Consultation Started',
                `Consultation with ${consultationData.patient.name} has started successfully!`,
                [
                  { 
                    text: 'Go to Consultation', 
                    onPress: () => {
                      // TODO: Navigate to consultation screen
                      console.log('Navigate to consultation screen');
                    }
                  }
                ]
              );
              
              console.log(`✅ DoctorAppointments - Consultation started successfully for appointment ${appointmentId}`);
            } catch (error) {
              console.error(`❌ DoctorAppointments - Error starting consultation:`, error);
              Alert.alert(
                'Error',
                'Failed to start consultation. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleAppointmentAction = async (appointmentId: number, action: 'confirm' | 'cancel' | 'complete') => {
    Alert.alert(
      action === 'confirm' ? 'Confirm Appointment' : action === 'complete' ? 'Complete Appointment' : 'Cancel Appointment',
      `Are you sure you want to ${action} this appointment?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              console.log(`🔍 DoctorAppointments - ${action}ing appointment ${appointmentId}`);
              const newStatus = action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : 'cancelled';
              const success = await doctorDashboardService.updateAppointmentStatus(appointmentId, newStatus);
              
              if (success) {
                // Update the local state
                setAppointments(prevAppointments => 
                  prevAppointments.map(apt => 
                    apt.id === appointmentId 
                      ? { ...apt, status: newStatus }
                      : apt
                  )
                );
                
                Alert.alert(
                  'Success',
                  `Appointment ${action === 'confirm' ? 'confirmed' : 'cancelled'} successfully!`,
                  [{ text: 'OK' }]
                );
                
                console.log(`✅ DoctorAppointments - Appointment ${appointmentId} ${action}ed successfully`);
              } else {
                Alert.alert(
                  'Error',
                  `Failed to ${action} appointment. Please try again.`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error(`❌ DoctorAppointments - Error ${action}ing appointment:`, error);
              Alert.alert('Error', `Failed to ${action} appointment. Please try again.`);
            }
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
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
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
              onPress={() => {
                console.log('🔍 Filter changed to:', filter.key);
                setSelectedFilter(filter.key as any);
              }}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
            <Text style={styles.errorTitle}>Unable to Load Appointments</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAppointments}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAppointments.length === 0 ? (
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
            <TouchableOpacity 
              key={appointment.id} 
              style={styles.appointmentCard}
              onPress={() => router.push(`/appointment-details?appointmentId=${appointment.id}`)}
            >
              <View style={styles.appointmentHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{appointment.first_name} {appointment.last_name}</Text>
                  <Text style={styles.patientEmail}>{appointment.email}</Text>
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
                  <Text style={styles.detailText}>{appointment.appointment_date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="clock-o" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.appointment_time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="stethoscope" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.appointment_type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="hospital-o" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.facility_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="file-text-o" size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{appointment.reason}</Text>
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
                    onPress={() => handleStartConsultation(appointment.id)}
                  >
                    <FontAwesome name="play" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Start Consultation</Text>
                  </TouchableOpacity>
                </View>
              )}

              {appointment.status === 'in_progress' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.inProgressButton]}
                    onPress={() => {
                      // TODO: Navigate to consultation screen
                      console.log('Navigate to consultation screen');
                    }}
                  >
                    <FontAwesome name="user-md" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Continue Consultation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleAppointmentAction(appointment.id, 'complete')}
                  >
                    <FontAwesome name="check-circle" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>End Consultation</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
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
  completeButton: {
    backgroundColor: '#27ae60',
  },
  inProgressButton: {
    backgroundColor: '#f39c12',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginTop: 15,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
