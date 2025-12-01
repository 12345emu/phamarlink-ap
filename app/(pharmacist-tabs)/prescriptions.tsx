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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { pharmacistPrescriptionService, PharmacistPrescription } from '../../services/pharmacistPrescriptionService';
import ProcessPrescriptionModal from '../../components/ProcessPrescriptionModal';
import AddMedicineToInventoryModal from '../../components/AddMedicineToInventoryModal';

// Using PharmacistPrescription from service

export default function PharmacistPrescriptions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PharmacistPrescription[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'pending' | 'filled' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, [selectedFilter]);

  // Handle barcode scanner navigation params
  useEffect(() => {
    if (params.action === 'add-medicine' && params.medicineId) {
      // Open add medicine modal with the scanned medicine
      setShowAddMedicineModal(true);
    }
  }, [params]);

  // Clear params after handling
  useFocusEffect(
    React.useCallback(() => {
      // Clear params when screen comes into focus to prevent re-triggering
      if (params.action) {
        router.setParams({ action: undefined, medicineId: undefined, barcode: undefined });
      }
    }, [params])
  );

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 PharmacistPrescriptions - Loading prescriptions');
      
      // Map filter to service-compatible status
      let status: 'all' | 'active' | 'pending' | 'filled' = 'all';
      if (selectedFilter === 'all') {
        status = 'all';
      } else if (selectedFilter === 'active' || selectedFilter === 'pending' || selectedFilter === 'filled') {
        status = selectedFilter;
      } else {
        // For 'completed' and 'cancelled', we'll filter client-side
        status = 'all';
      }
      
      const response = await pharmacistPrescriptionService.getPrescriptionsToProcess(status);
      
      if (response.success && response.data) {
        setPrescriptions(response.data);
        console.log('✅ PharmacistPrescriptions - Prescriptions loaded:', response.data.length);
      } else {
        setPrescriptions([]);
        if (response.message) {
          setError(response.message);
        }
      }
    } catch (error) {
      console.error('❌ PharmacistPrescriptions - Error loading prescriptions:', error);
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

  const handleProcessPrescription = (prescriptionId: number) => {
    setSelectedPrescriptionId(prescriptionId);
    setShowProcessModal(true);
  };

  const handleProcessSuccess = () => {
    loadPrescriptions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#d4af37';
      case 'pending': return '#f39c12';
      case 'filled': return '#2ecc71';
      case 'completed': return '#3498db';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'active', label: 'Active' },
    { key: 'filled', label: 'Filled' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prescriptions</Text>
        <Text style={styles.headerSubtitle}>Process & Fill Prescriptions</Text>
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


              <View style={styles.prescriptionFooter}>
                <Text style={styles.dateText}>
                  Date: {new Date(prescription.createdAt).toLocaleDateString()}
                </Text>
                
                {(prescription.status === 'active' || prescription.status === 'pending') && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.processButton]}
                      onPress={() => handleProcessPrescription(prescription.id)}
                    >
                      <FontAwesome name="check-circle" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Process Rx</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Process Prescription Modal */}
      <ProcessPrescriptionModal
        visible={showProcessModal}
        prescriptionId={selectedPrescriptionId}
        onClose={() => {
          setShowProcessModal(false);
          setSelectedPrescriptionId(null);
        }}
        onSuccess={handleProcessSuccess}
      />

      {/* Add Medicine Modal (from barcode scanner) */}
      <AddMedicineToInventoryModal
        visible={showAddMedicineModal}
        onClose={() => {
          setShowAddMedicineModal(false);
          router.setParams({ action: undefined, medicineId: undefined, barcode: undefined });
        }}
        onSuccess={() => {
          setShowAddMedicineModal(false);
          router.setParams({ action: undefined, medicineId: undefined, barcode: undefined });
          loadPrescriptions();
        }}
        initialMedicineId={params.medicineId ? parseInt(params.medicineId as string, 10) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1f3a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7a7a7a',
    marginTop: 4,
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
    backgroundColor: '#d4af37',
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
  processButton: {
    backgroundColor: '#d4af37',
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
