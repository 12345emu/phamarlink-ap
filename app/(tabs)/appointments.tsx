import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image, RefreshControl, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAppointments, Appointment } from '../../context/AppointmentsContext';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';

export default function AppointmentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { appointments, loading, error, cancelAppointment, rescheduleAppointment, refreshAppointments } = useAppointments();
  const { isAuthenticated, user } = useAuth();

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAppointments();
    setRefreshing(false);
  };

  // Show login prompt if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to view your appointments.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login') },
        ]
      );
    }
  }, [isAuthenticated]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      case 'rescheduled': return '#9b59b6';
      case 'no_show': return '#95a5a6';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'rescheduled': return 'Rescheduled';
      case 'no_show': return 'No Show';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-o';
      case 'confirmed': return 'check-circle';
      case 'completed': return 'check-circle';
      case 'cancelled': return 'times-circle';
      case 'rescheduled': return 'calendar-plus-o';
      case 'no_show': return 'exclamation-circle';
      default: return 'question-circle';
    }
  };

  // Check if appointment is within 24 hours (cannot be cancelled)
  const isWithin24Hours = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const [hours, minutes] = appointment.appointment_time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes));
    
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilAppointment < 24 && hoursUntilAppointment > 0;
  };

  const filteredAppointments = appointments
    .filter(appointment => {
      const matchesSearch = appointment.id.toString().includes(searchQuery) ||
                           appointment.hospitalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.appointment_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.reason?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || appointment.status === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const handleReschedule = (appointment: Appointment) => {
    router.push({
      pathname: '/reschedule-appointment-modal',
      params: { appointmentId: appointment.id.toString() }
    });
  };

  const handleCancel = (appointment: Appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment with ${appointment.doctorName || 'the doctor'}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await cancelAppointment(appointment.id);
            Alert.alert('Appointment Cancelled', 'Your appointment has been cancelled successfully.');
          } catch (error: any) {
            // Show the specific error message from the backend
            const errorMessage = error.message || 'Failed to cancel appointment. Please try again.';
            
            // Check if it's a 24-hour validation error
            if (errorMessage.includes('24 hours')) {
              Alert.alert(
                'Cannot Cancel Appointment', 
                'Appointments can only be cancelled at least 24 hours in advance. Please contact the hospital directly if you need to cancel urgently.',
                [
                  { text: 'OK', style: 'default' },
                  { 
                    text: 'Contact Hospital', 
                    onPress: () => handleContactHospital(appointment)
                  }
                ]
              );
            } else {
              Alert.alert('Cannot Cancel Appointment', errorMessage);
            }
          }
        }}
      ]
    );
  };

  const handleContactHospital = (appointment: Appointment) => {
    // Get facility contact info from appointment data
    const facilityPhone = appointment.facility_phone || '+233 20 111 1111';
    const facilityEmail = appointment.facility_email || 'info@communityhealth.com';
    
    Alert.alert(
      'Contact Hospital',
      `Contact ${appointment.hospitalName || 'the hospital'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: async () => {
          try {
            const canOpen = await Linking.canOpenURL(`tel:${facilityPhone}`);
            if (canOpen) {
              await Linking.openURL(`tel:${facilityPhone}`);
            } else {
              Alert.alert('Error', 'Cannot make phone calls on this device');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to make phone call');
          }
        }},
        { text: 'Email', onPress: async () => {
          try {
            const canOpen = await Linking.canOpenURL(`mailto:${facilityEmail}?subject=Appointment Inquiry - ID: ${appointment.id}`);
            if (canOpen) {
              await Linking.openURL(`mailto:${facilityEmail}?subject=Appointment Inquiry - ID: ${appointment.id}`);
            } else {
              Alert.alert('Error', 'No email app found on this device');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to open email app');
          }
        }}
      ]
    );
  };

  // Show loading state
  if (loading && appointments.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <FontAwesome name="spinner" size={40} color={ACCENT} />
          <Text style={styles.loadingText}>Loading your appointments...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error && appointments.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={40} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error Loading Appointments</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshAppointments}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
              style={[styles.filterChip, activeFilter === 'pending' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('pending')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'pending' && styles.activeFilterChipText]}>
                Pending
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'confirmed' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('confirmed')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'confirmed' && styles.activeFilterChipText]}>
                Confirmed
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
            {!searchQuery && activeFilter === 'all' && (
              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.bookButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <TouchableOpacity 
              key={appointment.id} 
              style={styles.appointmentCard}
              onPress={() => router.push({
                pathname: '/appointment-details-modal',
                params: {
                  appointmentId: appointment.id.toString()
                }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentId}>#{appointment.id}</Text>
                  <Text style={styles.appointmentDate}>
                    {new Date(appointment.appointment_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                  <FontAwesome name={getStatusIcon(appointment.status) as any} size={12} color="#fff" />
                  <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                </View>
              </View>

              <View style={styles.hospitalInfo}>
                <Image 
                  source={{ uri: appointment.hospitalImage || 'https://via.placeholder.com/50x50/3498db/ffffff?text=H' }} 
                  style={styles.hospitalImage} 
                />
                <View style={styles.hospitalDetails}>
                  <Text style={styles.hospitalName}>{appointment.hospitalName}</Text>
                  <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                  <Text style={styles.specialty}>{appointment.specialty}</Text>
                  {isWithin24Hours(appointment) && (
                    <View style={styles.warningContainer}>
                      <FontAwesome name="exclamation-triangle" size={12} color="#f39c12" />
                      <Text style={styles.warningText}>Within 24 hours - cannot cancel</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <FontAwesome name="clock-o" size={14} color={ACCENT} />
                  <Text style={styles.detailText}>{appointment.appointment_time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="stethoscope" size={14} color={ACCENT} />
                  <Text style={styles.detailText}>{appointment.appointment_type}</Text>
                </View>
                {appointment.reason && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="sticky-note-o" size={14} color={ACCENT} />
                    <Text style={styles.detailText} numberOfLines={2}>{appointment.reason}</Text>
                  </View>
                )}
                {appointment.notes && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="comment-o" size={14} color={ACCENT} />
                    <Text style={styles.detailText} numberOfLines={2}>{appointment.notes}</Text>
                  </View>
                )}
              </View>

              <View style={styles.appointmentActions}>
                {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
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
                      style={[
                        styles.actionButton,
                        isWithin24Hours(appointment) && styles.disabledActionButton
                      ]}
                      onPress={() => handleCancel(appointment)}
                      activeOpacity={isWithin24Hours(appointment) ? 1 : 0.7}
                      disabled={isWithin24Hours(appointment)}
                    >
                      <FontAwesome 
                        name="times" 
                        size={14} 
                        color={isWithin24Hours(appointment) ? '#95a5a6' : '#e74c3c'} 
                      />
                      <Text style={[
                        styles.actionButtonText, 
                        { color: isWithin24Hours(appointment) ? '#95a5a6' : '#e74c3c' }
                      ]}>
                        {isWithin24Hours(appointment) ? 'Cannot Cancel' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleContactHospital(appointment)}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="phone" size={14} color={ACCENT} />
                  <Text style={styles.actionButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    flex: 1,
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
  disabledActionButton: {
    opacity: 0.5,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#f39c12',
    fontWeight: '500',
    marginLeft: 4,
  },
}); 