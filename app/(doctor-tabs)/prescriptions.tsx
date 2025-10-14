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

interface Prescription {
  id: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  refills?: number;
  notes?: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export default function DoctorPrescriptions() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 DoctorPrescriptions - Loading prescriptions');
      
      const response = await doctorDashboardService.getAllPrescriptions(20, 1, selectedFilter === 'all' ? 'all' : selectedFilter);
      
      if (response.prescriptions) {
        setPrescriptions(response.prescriptions);
        console.log('✅ DoctorPrescriptions - Prescriptions loaded:', response.prescriptions.length);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('❌ DoctorPrescriptions - Error loading prescriptions:', error);
      setError('Failed to load prescriptions. Please try again.');
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  // No mock data - using real API data

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    return selectedFilter === 'all' || prescription.status === selectedFilter;
  });

  const handlePrescriptionAction = (prescriptionId: number, action: 'send' | 'cancel') => {
    Alert.alert(
      action === 'send' ? 'Send Prescription' : 'Cancel Prescription',
      `Are you sure you want to ${action} this prescription?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            // TODO: Implement API call
            setPrescriptions(prev => prev.map(pres => 
              pres.id === prescriptionId 
                ? { ...pres, status: action === 'send' ? 'completed' : 'cancelled' }
                : pres
            ));
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#2ecc71';
      case 'pending': return '#f39c12';
      case 'filled': return '#3498db';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Create Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prescriptions</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            // TODO: Navigate to create prescription screen
            Alert.alert('Create Prescription', 'This will open the prescription creation form');
          }}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
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

      {/* Prescriptions List */}
      <ScrollView
        style={styles.prescriptionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading prescriptions...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-triangle" size={60} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPrescriptions}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredPrescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="file-text-o" size={60} color="#bdc3c7" />
            <Text style={styles.emptyText}>No prescriptions found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'You have no prescriptions yet'
                : `No ${selectedFilter} prescriptions found`
              }
            </Text>
          </View>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <View key={prescription.id} style={styles.prescriptionCard}>
              <View style={styles.prescriptionHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{prescription.patientName}</Text>
                  <Text style={styles.patientEmail}>{prescription.patientEmail}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(prescription.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.medicationsContainer}>
                <Text style={styles.medicationsTitle}>Medication:</Text>
                <View style={styles.medicationItem}>
                  <Text style={styles.medicationName}>{prescription.medicationName}</Text>
                  <Text style={styles.medicationDetails}>
                    {prescription.dosage} - {prescription.frequency} - {prescription.duration}
                  </Text>
                  {prescription.instructions && (
                    <Text style={styles.medicationInstructions}>
                      Instructions: {prescription.instructions}
                    </Text>
                  )}
                </View>
              </View>

              {prescription.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{prescription.notes}</Text>
                </View>
              )}

              <View style={styles.prescriptionFooter}>
                <Text style={styles.dateText}>Date: {prescription.date}</Text>
                
                {prescription.status === 'active' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.sendButton]}
                      onPress={() => handlePrescriptionAction(prescription.id, 'send')}
                    >
                      <FontAwesome name="send" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Send</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handlePrescriptionAction(prescription.id, 'cancel')}
                    >
                      <FontAwesome name="times" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  prescriptionsList: {
    flex: 1,
    padding: 20,
  },
  prescriptionCard: {
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
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
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
  medicationsContainer: {
    marginBottom: 15,
  },
  medicationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  medicationItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  medicationDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  medicationInstructions: {
    fontSize: 14,
    color: '#34495e',
    marginTop: 5,
    fontStyle: 'italic',
  },
  notesContainer: {
    backgroundColor: '#e8f4fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  prescriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  sendButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
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
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 15,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
