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

interface Prescription {
  id: number;
  patientName: string;
  patientEmail: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  date: string;
  status: 'pending' | 'sent' | 'filled' | 'cancelled';
  notes?: string;
}

export default function DoctorPrescriptions() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'sent' | 'filled'>('all');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    // TODO: Replace with actual API call
    const mockPrescriptions: Prescription[] = [
      {
        id: 1,
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        medications: [
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: '3 times daily',
            duration: '7 days',
          },
          {
            name: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'As needed',
            duration: '5 days',
          },
        ],
        date: '2024-01-15',
        status: 'sent',
        notes: 'Take with food. Complete full course of antibiotics.',
      },
      {
        id: 2,
        patientName: 'Jane Smith',
        patientEmail: 'jane@example.com',
        medications: [
          {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: '4 times daily',
            duration: '3 days',
          },
        ],
        date: '2024-01-14',
        status: 'pending',
      },
      {
        id: 3,
        patientName: 'Mike Johnson',
        patientEmail: 'mike@example.com',
        medications: [
          {
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '30 days',
          },
        ],
        date: '2024-01-13',
        status: 'filled',
        notes: 'Continue as prescribed. Monitor blood sugar levels.',
      },
    ];
    setPrescriptions(mockPrescriptions);
  };

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
                ? { ...pres, status: action === 'send' ? 'sent' : 'cancelled' }
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
    { key: 'pending', label: 'Pending' },
    { key: 'sent', label: 'Sent' },
    { key: 'filled', label: 'Filled' },
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
        {filteredPrescriptions.length === 0 ? (
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
                <Text style={styles.medicationsTitle}>Medications:</Text>
                {prescription.medications.map((medication, index) => (
                  <View key={index} style={styles.medicationItem}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <Text style={styles.medicationDetails}>
                      {medication.dosage} - {medication.frequency} - {medication.duration}
                    </Text>
                  </View>
                ))}
              </View>

              {prescription.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{prescription.notes}</Text>
                </View>
              )}

              <View style={styles.prescriptionFooter}>
                <Text style={styles.dateText}>Date: {prescription.date}</Text>
                
                {prescription.status === 'pending' && (
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
});
