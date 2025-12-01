import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { doctorDashboardService } from '../../services/doctorDashboardService';
// Removed PatientHistoryModal import - now using router navigation
// Removed PrescriptionModal import - now using router navigation
// Removed PatientChatModal import - now using router navigation

interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  profileImage?: string | null;
  lastVisit: string | null;
  nextAppointment?: string | null;
  totalAppointments: number;
  status: 'active' | 'inactive';
  patientSince: string;
}

export default function PharmacistPatients() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  // Removed historyModalVisible - now using router navigation
  // Removed prescriptionModalVisible - now using router navigation
  // Removed selectedPatient - now using router navigation

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      loadPatients();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedFilter]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 DoctorPatients - Loading patients with filters:', { searchQuery, selectedFilter });
      
      const response = await doctorDashboardService.getPatients(20, 1, searchQuery, selectedFilter);
      
      console.log('🔍 DoctorPatients - API Response:', JSON.stringify(response, null, 2));
      
      if (response && response.patients) {
        setPatients(response.patients);
        setPagination(response.pagination);
        console.log('✅ DoctorPatients - Patients loaded successfully:', response.patients.length);
      } else {
        setPatients([]);
        setPagination({ total: 0, page: 1, limit: 20, pages: 0 });
        console.log('⚠️ DoctorPatients - No patients data received');
      }
    } catch (error) {
      console.error('❌ DoctorPatients - Error loading patients:', error);
      setError('Failed to load patients. Please try again.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const handlePatientAction = (patientId: number, action: 'history' | 'chat' | 'prescribe', patientName: string) => {
    if (action === 'history') {
      // Navigate to patient history screen instead of opening modal
      router.push({
        pathname: '/patient-history-modal',
        params: {
          patientId: patientId.toString(),
          patientName: patientName
        }
      });
    } else if (action === 'prescribe') {
      // Navigate to prescription screen instead of opening modal
      router.push({
        pathname: '/prescription-modal',
        params: {
          patientId: patientId.toString(),
          patientName: patientName
        }
      });
    } else if (action === 'chat') {
      // Navigate to chat screen instead of opening modal
      router.push({
        pathname: '/patient-chat-modal',
        params: {
          patientId: patientId.toString(),
          patientName: patientName
        }
      });
    }
  };

  // Removed closeHistoryModal - no longer needed with router navigation
  // Removed closePrescriptionModal - no longer needed with router navigation
  // Removed closeChatModal - no longer needed with router navigation

  const filters = [
    { key: 'all', label: 'All Patients' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#bdc3c7"
          />
        </View>
      </View>

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

      {/* Patients List */}
      <ScrollView
        style={styles.patientsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingState}>
            <FontAwesome name="spinner" size={40} color="#3498db" />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <FontAwesome name="exclamation-triangle" size={60} color="#e74c3c" />
            <Text style={styles.errorText}>Error Loading Patients</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="users" size={60} color="#bdc3c7" />
            <Text style={styles.emptyText}>No patients found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'You have no patients yet'
              }
            </Text>
          </View>
        ) : (
          patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              onPress={() => {
                // TODO: Navigate to patient details
                console.log('Navigate to patient details:', patient.id);
              }}
            >
              <View style={styles.patientHeader}>
                <View style={styles.patientAvatar}>
                  {patient.profileImage ? (
                    <Image
                      source={{ uri: patient.profileImage }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  )}
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientEmail}>{patient.email}</Text>
                  <Text style={styles.patientPhone}>{patient.phone}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: patient.status === 'active' ? '#2ecc71' : '#95a5a6' }
                ]}>
                  <Text style={styles.statusText}>
                    {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.patientDetails}>
                <View style={styles.detailRow}>
                  <FontAwesome name="calendar" size={14} color="#7f8c8d" />
                  <Text style={styles.detailLabel}>Last Visit:</Text>
                  <Text style={styles.detailText}>
                    {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No visits yet'}
                  </Text>
                </View>
                {patient.nextAppointment && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="clock-o" size={14} color="#7f8c8d" />
                    <Text style={styles.detailLabel}>Next Appointment:</Text>
                    <Text style={[styles.detailText, { color: '#3498db' }]}>
                      {new Date(patient.nextAppointment).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <FontAwesome name="stethoscope" size={14} color="#7f8c8d" />
                  <Text style={styles.detailLabel}>Total Appointments:</Text>
                  <Text style={styles.detailText}>{patient.totalAppointments}</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handlePatientAction(patient.id, 'history', patient.name)}
                >
                  <FontAwesome name="file-text-o" size={14} color="#3498db" />
                  <Text style={styles.actionButtonText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handlePatientAction(patient.id, 'chat', patient.name)}
                >
                  <FontAwesome name="comments" size={14} color="#2ecc71" />
                  <Text style={styles.actionButtonText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handlePatientAction(patient.id, 'prescribe', patient.name)}
                >
                  <FontAwesome name="plus" size={14} color="#e74c3c" />
                  <Text style={styles.actionButtonText}>Prescribe</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

        {/* Patient History Modal removed - now using router navigation */}
        {/* Prescription Modal removed - now using router navigation */}
        {/* Chat Modal removed - now using router navigation */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2c3e50',
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
  patientsList: {
    flex: 1,
    padding: 20,
  },
  patientCard: {
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
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  patientPhone: {
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
  patientDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
    marginRight: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    gap: 5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
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
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#3498db',
    marginTop: 15,
    fontWeight: '500',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginTop: 15,
  },
  errorSubtext: {
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
    fontSize: 16,
    fontWeight: '600',
  },
});
