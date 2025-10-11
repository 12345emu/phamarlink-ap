import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
  nextAppointment?: string;
  status: 'active' | 'inactive';
}

export default function DoctorPatients() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    // TODO: Replace with actual API call
    const mockPatients: Patient[] = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+233 24 123 4567',
        lastVisit: '2024-01-10',
        nextAppointment: '2024-01-20',
        status: 'active',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+233 24 234 5678',
        lastVisit: '2024-01-08',
        status: 'active',
      },
      {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '+233 24 345 6789',
        lastVisit: '2023-12-15',
        status: 'inactive',
      },
      {
        id: 4,
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        phone: '+233 24 456 7890',
        lastVisit: '2024-01-12',
        nextAppointment: '2024-01-25',
        status: 'active',
      },
    ];
    setPatients(mockPatients);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || patient.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

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
        {filteredPatients.length === 0 ? (
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
          filteredPatients.map((patient) => (
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
                  <Text style={styles.avatarText}>
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </Text>
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
                  <Text style={styles.detailText}>{patient.lastVisit}</Text>
                </View>
                {patient.nextAppointment && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="clock-o" size={14} color="#7f8c8d" />
                    <Text style={styles.detailLabel}>Next Appointment:</Text>
                    <Text style={[styles.detailText, { color: '#3498db' }]}>
                      {patient.nextAppointment}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Navigate to patient medical history
                    console.log('View medical history:', patient.id);
                  }}
                >
                  <FontAwesome name="file-text-o" size={14} color="#3498db" />
                  <Text style={styles.actionButtonText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Navigate to chat with patient
                    console.log('Chat with patient:', patient.id);
                  }}
                >
                  <FontAwesome name="comments" size={14} color="#2ecc71" />
                  <Text style={styles.actionButtonText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Create prescription for patient
                    console.log('Create prescription:', patient.id);
                  }}
                >
                  <FontAwesome name="plus" size={14} color="#e74c3c" />
                  <Text style={styles.actionButtonText}>Prescribe</Text>
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
});
