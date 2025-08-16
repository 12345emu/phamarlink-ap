import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  View, 
  Text, 
  Alert, 
  Platform, 
  Dimensions,
  ActivityIndicator 
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppointments } from '../context/AppointmentsContext';
import { appointmentsService } from '../services/appointmentsService';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const WARNING = '#f39c12';
const DANGER = '#e74c3c';
const BACKGROUND = '#f8f9fa';

interface AppointmentDetails {
  id: number;
  user_id: number;
  facility_id: number;
  facility_name?: string;
  doctor_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  reason: string;
  symptoms: string[];
  preferred_doctor?: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'no_show';
  created_at: string;
  updated_at: string;
}

export default function AppointmentDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { cancelAppointment, rescheduleAppointment } = useAppointments();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const appointmentId = params.appointmentId as string;

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      if (!appointmentId) {
        throw new Error('No appointment ID provided');
      }

      const appointmentData = await appointmentsService.getAppointmentById(parseInt(appointmentId));
      setAppointment(appointmentData);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = () => {
    if (!appointment) return;

    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await cancelAppointment(appointment.id);
              Alert.alert('Success', 'Appointment cancelled successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel appointment');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRescheduleAppointment = () => {
    if (!appointment) return;
    
    router.push({
      pathname: '/reschedule-appointment-modal',
      params: {
        appointmentId: appointment.id.toString(),
        facilityId: appointment.facility_id.toString(),
        facilityName: appointment.facility_name,
        currentDate: appointment.appointment_date,
        currentTime: appointment.appointment_time,
        appointmentType: appointment.appointment_type
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return SUCCESS;
      case 'pending': return WARNING;
      case 'cancelled': return DANGER;
      case 'completed': return ACCENT;
      case 'rescheduled': return WARNING;
      case 'no_show': return DANGER;
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'pending': return 'clock-o';
      case 'cancelled': return 'times-circle';
      case 'completed': return 'check-square-o';
      case 'rescheduled': return 'refresh';
      case 'no_show': return 'exclamation-circle';
      default: return 'question-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color={DANGER} />
          <Text style={styles.errorText}>Appointment not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
            <FontAwesome name={getStatusIcon(appointment.status) as any} size={16} color={getStatusColor(appointment.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <FontAwesome name="hospital-o" size={16} color={ACCENT} />
              <Text style={styles.infoLabel}>Facility:</Text>
              <Text style={styles.infoValue}>{appointment.facility_name || 'Not specified'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="calendar" size={16} color={ACCENT} />
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDate(appointment.appointment_date)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="clock-o" size={16} color={ACCENT} />
              <Text style={styles.infoLabel}>Time:</Text>
              <Text style={styles.infoValue}>{formatTime(appointment.appointment_time)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="stethoscope" size={16} color={ACCENT} />
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>
                {appointment.appointment_type.charAt(0).toUpperCase() + appointment.appointment_type.slice(1)}
              </Text>
            </View>
            
            {appointment.doctor_name && (
              <View style={styles.infoRow}>
                <FontAwesome name="user-md" size={16} color={ACCENT} />
                <Text style={styles.infoLabel}>Doctor:</Text>
                <Text style={styles.infoValue}>{appointment.doctor_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reason and Symptoms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Reason for Visit</Text>
              <Text style={styles.infoValue}>{appointment.reason}</Text>
            </View>
            
            {appointment.symptoms && Array.isArray(appointment.symptoms) && appointment.symptoms.length > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Symptoms</Text>
                {appointment.symptoms.map((symptom, index) => (
                  <View key={index} style={styles.symptomItem}>
                    <FontAwesome name="circle" size={8} color={ACCENT} />
                    <Text style={styles.symptomText}>{symptom}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {appointment.notes && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Additional Notes</Text>
                <Text style={styles.infoValue}>{appointment.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Appointment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment History</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <FontAwesome name="calendar-plus-o" size={16} color={ACCENT} />
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>{formatDate(appointment.created_at)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <FontAwesome name="edit" size={16} color={ACCENT} />
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>{formatDate(appointment.updated_at)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {appointment.status === 'pending' || appointment.status === 'confirmed' ? (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={handleRescheduleAppointment}
            disabled={actionLoading}
          >
            <FontAwesome name="refresh" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelAppointment}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="times" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: DANGER,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginLeft: 12,
    marginRight: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  infoItem: {
    marginBottom: 16,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  symptomText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescheduleButton: {
    backgroundColor: ACCENT,
  },
  cancelButton: {
    backgroundColor: DANGER,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
}); 