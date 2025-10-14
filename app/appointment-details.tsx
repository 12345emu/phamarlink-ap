import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doctorDashboardService } from '../services/doctorDashboardService';

interface AppointmentDetails {
  id: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason: string;
  status: string;
  facilityName: string;
  facilityAddress?: string;
  createdAt: string;
  notes?: string;
}

export default function AppointmentDetails() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId) {
      loadAppointmentDetails();
    }
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 AppointmentDetails - Loading appointment:', appointmentId);
      
      // For now, we'll get the appointment from the appointments list
      // In a real app, you'd have a specific endpoint for appointment details
      const response = await doctorDashboardService.getAppointments(50, 1);
      
      if (response && response.length > 0) {
        const foundAppointment = response.find(apt => apt.id === parseInt(appointmentId as string));
        if (foundAppointment) {
          setAppointment({
            id: foundAppointment.id,
            patientId: foundAppointment.user_id,
            patientName: `${foundAppointment.first_name} ${foundAppointment.last_name}`,
            patientEmail: foundAppointment.email,
            patientPhone: foundAppointment.phone,
            appointmentDate: foundAppointment.appointment_date,
            appointmentTime: foundAppointment.appointment_time,
            appointmentType: foundAppointment.appointment_type,
            reason: foundAppointment.reason,
            status: foundAppointment.status,
            facilityName: foundAppointment.facility_name,
            facilityAddress: foundAppointment.facility_address,
            createdAt: foundAppointment.created_at,
            notes: foundAppointment.notes
          });
        } else {
          setError('Appointment not found');
        }
      } else {
        setError('Failed to load appointment details');
      }
    } catch (error) {
      console.error('❌ AppointmentDetails - Error loading appointment:', error);
      setError('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointmentDetails();
    setRefreshing(false);
  };

  const handleAppointmentAction = async (action: 'confirm' | 'cancel' | 'start-consultation') => {
    if (!appointment) return;

    try {
      setActionLoading(true);
      console.log(`🔍 AppointmentDetails - ${action} appointment:`, appointment.id);

      if (action === 'start-consultation') {
        const result = await doctorDashboardService.startConsultation(appointment.id);
        if (result) {
          Alert.alert('Success', 'Consultation started successfully!', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      } else {
        const status = action === 'confirm' ? 'confirmed' : 'cancelled';
        const success = await doctorDashboardService.updateAppointmentStatus(appointment.id, status);
        
        if (success) {
          Alert.alert('Success', `Appointment ${action}ed successfully!`, [
            { text: 'OK', onPress: () => {
              loadAppointmentDetails(); // Refresh the appointment data
            }}
          ]);
        }
      }
    } catch (error) {
      console.error(`❌ AppointmentDetails - Error ${action}ing appointment:`, error);
      Alert.alert('Error', `Failed to ${action} appointment. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#2ecc71';
      case 'pending': return '#f39c12';
      case 'cancelled': return '#e74c3c';
      case 'completed': return '#95a5a6';
      case 'in_progress': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const canConfirm = appointment?.status === 'pending';
  const canCancel = appointment?.status === 'pending' || appointment?.status === 'confirmed';
  const canStartConsultation = appointment?.status === 'confirmed';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error || 'Appointment not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAppointmentDetails}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Appointment Card */}
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{appointment.patientName}</Text>
            <Text style={styles.patientEmail}>{appointment.patientEmail}</Text>
            {appointment.patientPhone && (
              <Text style={styles.patientPhone}>{appointment.patientPhone}</Text>
            )}
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(appointment.status) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(appointment.status)}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <FontAwesome name="calendar" size={16} color="#7f8c8d" />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(appointment.appointmentDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="clock-o" size={16} color="#7f8c8d" />
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{appointment.appointmentTime}</Text>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="stethoscope" size={16} color="#7f8c8d" />
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{appointment.appointmentType}</Text>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="file-text-o" size={16} color="#7f8c8d" />
            <Text style={styles.detailLabel}>Reason:</Text>
            <Text style={styles.detailValue}>{appointment.reason}</Text>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="hospital-o" size={16} color="#7f8c8d" />
            <Text style={styles.detailLabel}>Facility:</Text>
            <Text style={styles.detailValue}>{appointment.facilityName}</Text>
          </View>

          {appointment.facilityAddress && (
            <View style={styles.detailRow}>
              <FontAwesome name="map-marker" size={16} color="#7f8c8d" />
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{appointment.facilityAddress}</Text>
            </View>
          )}

          {appointment.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {canConfirm && (
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleAppointmentAction('confirm')}
            disabled={actionLoading}
          >
            <FontAwesome name="check" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleAppointmentAction('cancel')}
            disabled={actionLoading}
          >
            <FontAwesome name="times" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {canStartConsultation && (
          <TouchableOpacity
            style={[styles.actionButton, styles.consultationButton]}
            onPress={() => handleAppointmentAction('start-consultation')}
            disabled={actionLoading}
          >
            <FontAwesome name="play" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Start Consultation</Text>
          </TouchableOpacity>
        )}
      </View>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  placeholder: {
    width: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 20,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  patientPhone: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  notesContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 15,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  consultationButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
