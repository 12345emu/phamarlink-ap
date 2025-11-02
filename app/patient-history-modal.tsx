import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doctorDashboardService } from '../services/doctorDashboardService';
import MedicalNotesModal from './medical-notes-modal';

interface Appointment {
  id: number;
  date: string;
  time: string;
  type: string;
  reason: string;
  symptoms: string[];
  status: string;
  notes?: string;
  createdAt: string;
  facility: {
    name: string;
    address: string;
  };
}

interface Prescription {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  created_at: string;
  status: string;
}

interface PatientProfile {
  emergencyContact?: string;
  emergencyContactName?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  bloodType?: string;
  allergies: string[];
  medicalHistory: string[];
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface PatientHistoryData {
  patient: {
    id: number;
    name: string;
    email: string;
    phone: string;
    patientSince: string;
    profile: PatientProfile;
  };
  appointments: {
    data: Appointment[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  prescriptions: Prescription[];
}

export default function PatientHistoryModal() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams();
  
  const patientIdNum = parseInt(patientId as string);
  const patientNameStr = patientName as string;
  
  const handleClose = () => {
    router.back();
  };
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<PatientHistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'appointments' | 'prescriptions' | 'medical-notes'>('profile');
  const [medicalNotesModalVisible, setMedicalNotesModalVisible] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState<any[]>([]);
  const [medicalNotesLoading, setMedicalNotesLoading] = useState(false);

  useEffect(() => {
    if (patientIdNum) {
      loadPatientHistory();
    }
  }, [patientIdNum]);

  const loadPatientHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 PatientHistoryModal - Loading history for patient:', patientIdNum);
      
      const data = await doctorDashboardService.getPatientHistory(patientIdNum);
      
      console.log('🔍 PatientHistoryModal - History data received:', data);
      
      setHistoryData(data);
    } catch (error) {
      console.error('❌ PatientHistoryModal - Error loading history:', error);
      setError('Failed to load patient history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalNotes = async () => {
    try {
      setMedicalNotesLoading(true);
      
      console.log('🔍 PatientHistoryModal - Loading medical notes:', { patientId: patientIdNum });
      
      const response = await doctorDashboardService.getPatientMedicalNotes(patientIdNum);
      
      console.log('🔍 PatientHistoryModal - Medical notes response:', JSON.stringify(response, null, 2));
      
      if (response && response.notes) {
        setMedicalNotes(response.notes);
        console.log('✅ PatientHistoryModal - Medical notes loaded successfully:', response.notes.length);
      } else {
        setMedicalNotes([]);
        console.log('⚠️ PatientHistoryModal - No medical notes found');
      }
    } catch (err: any) {
      console.error('❌ PatientHistoryModal - Error loading medical notes:', err);
      setMedicalNotes([]);
    } finally {
      setMedicalNotesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientHistory();
    if (activeTab === 'medical-notes') {
      await loadMedicalNotes();
    }
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'confirmed': return '#2ecc71';
      case 'pending': return '#f39c12';
      case 'cancelled': return '#e74c3c';
      case 'in_progress': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAppointment = (appointment: Appointment) => (
    <View key={appointment.id} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentDate}>
          <Text style={styles.appointmentDateText}>{formatDate(appointment.date)}</Text>
          <Text style={styles.appointmentTimeText}>{formatTime(appointment.time)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>{appointment.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <Text style={styles.appointmentType}>{appointment.type.toUpperCase()}</Text>
        <Text style={styles.appointmentReason}>{appointment.reason}</Text>
        
        {appointment.symptoms.length > 0 && (
          <View style={styles.symptomsContainer}>
            <Text style={styles.symptomsLabel}>Symptoms:</Text>
            <View style={styles.symptomsList}>
              {appointment.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomTag}>
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {appointment.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}
        
        <Text style={styles.facilityText}>{appointment.facility.name}</Text>
      </View>
    </View>
  );

  const renderPrescription = (prescription: Prescription) => (
    <View key={prescription.id} style={styles.prescriptionCard}>
      <View style={styles.prescriptionHeader}>
        <Text style={styles.medicationName}>{prescription.medication_name}</Text>
        <Text style={styles.prescriptionDate}>{formatDate(prescription.created_at)}</Text>
      </View>
      
      <View style={styles.prescriptionDetails}>
        <View style={styles.prescriptionRow}>
          <Text style={styles.prescriptionLabel}>Dosage:</Text>
          <Text style={styles.prescriptionValue}>{prescription.dosage}</Text>
        </View>
        <View style={styles.prescriptionRow}>
          <Text style={styles.prescriptionLabel}>Frequency:</Text>
          <Text style={styles.prescriptionValue}>{prescription.frequency}</Text>
        </View>
        <View style={styles.prescriptionRow}>
          <Text style={styles.prescriptionLabel}>Duration:</Text>
          <Text style={styles.prescriptionValue}>{prescription.duration}</Text>
        </View>
        {prescription.instructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsLabel}>Instructions:</Text>
            <Text style={styles.instructionsText}>{prescription.instructions}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMedicalNote = (note: any) => (
    <View key={note.id} style={styles.medicalNoteCard}>
      <View style={styles.medicalNoteHeader}>
        <Text style={styles.medicalNoteDate}>
          {new Date(note.createdAt).toLocaleDateString()}
        </Text>
        {note.appointment && (
          <Text style={styles.medicalNoteAppointment}>
            Appointment: {new Date(note.appointment.date).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      <View style={styles.medicalNoteContent}>
        <View style={styles.medicalNoteSection}>
          <Text style={styles.medicalNoteLabel}>Diagnosis:</Text>
          <Text style={styles.medicalNoteText}>{note.diagnosis}</Text>
        </View>
        
        <View style={styles.medicalNoteSection}>
          <Text style={styles.medicalNoteLabel}>Symptoms:</Text>
          <Text style={styles.medicalNoteText}>{note.symptoms}</Text>
        </View>
        
        <View style={styles.medicalNoteSection}>
          <Text style={styles.medicalNoteLabel}>Treatment:</Text>
          <Text style={styles.medicalNoteText}>{note.treatment}</Text>
        </View>
        
        {note.medications && (
          <View style={styles.medicalNoteSection}>
            <Text style={styles.medicalNoteLabel}>Medications:</Text>
            <Text style={styles.medicalNoteText}>{note.medications}</Text>
          </View>
        )}
        
        {note.notes && (
          <View style={styles.medicalNoteSection}>
            <Text style={styles.medicalNoteLabel}>Additional Notes:</Text>
            <Text style={styles.medicalNoteText}>{note.notes}</Text>
          </View>
        )}
        
        {note.followUpDate && (
          <View style={styles.medicalNoteSection}>
            <Text style={styles.medicalNoteLabel}>Follow-up Date:</Text>
            <Text style={styles.medicalNoteText}>{note.followUpDate}</Text>
          </View>
        )}
        
        {note.followUpNotes && (
          <View style={styles.medicalNoteSection}>
            <Text style={styles.medicalNoteLabel}>Follow-up Instructions:</Text>
            <Text style={styles.medicalNoteText}>{note.followUpNotes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPatientProfile = (profile: PatientProfile) => (
    <View style={styles.profileContainer}>
      {/* Basic Information */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.profileGrid}>
          {profile.bloodType && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Blood Type</Text>
              <Text style={styles.profileValue}>{profile.bloodType}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Contact Information */}
      {(profile.address || profile.city || profile.state || profile.country || profile.postalCode) && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {profile.address && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Address</Text>
              <Text style={styles.profileValue}>{profile.address}</Text>
            </View>
          )}
          {(profile.city || profile.state || profile.country) && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Location</Text>
              <Text style={styles.profileValue}>
                {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                {profile.postalCode && ` ${profile.postalCode}`}
              </Text>
            </View>
          )}
          {profile.emergencyContact && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Emergency Contact</Text>
              <Text style={styles.profileValue}>
                {profile.emergencyContactName ? `${profile.emergencyContactName} - ` : ''}
                {profile.emergencyContact}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Medical Information */}
      {(profile.medicalHistory.length > 0 || profile.allergies.length > 0) && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          {profile.medicalHistory.length > 0 && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Medical History</Text>
              <View style={styles.tagsContainer}>
                {profile.medicalHistory.map((condition, index) => (
                  <View key={index} style={styles.medicalTag}>
                    <Text style={styles.medicalTagText}>{condition}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {profile.allergies.length > 0 && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Allergies</Text>
              <View style={styles.tagsContainer}>
                {profile.allergies.map((allergy, index) => (
                  <View key={index} style={styles.allergyTag}>
                    <Text style={styles.allergyTagText}>{allergy}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Insurance Information */}
      {(profile.insuranceProvider || profile.insuranceNumber) && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Insurance Information</Text>
          {profile.insuranceProvider && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Insurance Provider</Text>
              <Text style={styles.profileValue}>{profile.insuranceProvider}</Text>
            </View>
          )}
          {profile.insuranceNumber && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Insurance Number</Text>
              <Text style={styles.profileValue}>{profile.insuranceNumber}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <FontAwesome name="times" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical History</Text>
        <View style={styles.placeholder} />
      </View>

        {/* Patient Info */}
        {historyData && (
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{historyData.patient.name}</Text>
            <Text style={styles.patientDetails}>
              {historyData.patient.email} • {historyData.patient.phone}
            </Text>
            <Text style={styles.patientSince}>
              Patient since {formatDate(historyData.patient.patientSince)}
            </Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>
              Appointments ({historyData?.appointments.pagination.total || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
            onPress={() => setActiveTab('prescriptions')}
          >
            <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText]}>
              Prescriptions ({historyData?.prescriptions.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'medical-notes' && styles.activeTab]}
            onPress={() => {
              setActiveTab('medical-notes');
              loadMedicalNotes();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'medical-notes' && styles.activeTabText]}>
              Medical Notes ({medicalNotes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <FontAwesome name="spinner" size={40} color="#3498db" />
              <Text style={styles.loadingText}>Loading medical history...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <FontAwesome name="exclamation-triangle" size={60} color="#e74c3c" />
              <Text style={styles.errorText}>Error Loading History</Text>
              <Text style={styles.errorSubtext}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPatientHistory}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : !historyData ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="file-text-o" size={60} color="#bdc3c7" />
              <Text style={styles.emptyText}>No history available</Text>
            </View>
          ) : (
            <>
              {activeTab === 'profile' && (
                <View style={styles.tabContent}>
                  {historyData.patient.profile ? (
                    renderPatientProfile(historyData.patient.profile)
                  ) : (
                    <View style={styles.emptyContainer}>
                      <FontAwesome name="user" size={60} color="#bdc3c7" />
                      <Text style={styles.emptyText}>No profile information available</Text>
                    </View>
                  )}
                </View>
              )}
              
              {activeTab === 'appointments' && (
                <View style={styles.tabContent}>
                  {historyData.appointments.data.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <FontAwesome name="calendar" size={60} color="#bdc3c7" />
                      <Text style={styles.emptyText}>No appointments found</Text>
                    </View>
                  ) : (
                    historyData.appointments.data.map(renderAppointment)
                  )}
                </View>
              )}
              
              {activeTab === 'prescriptions' && (
                <View style={styles.tabContent}>
                  {historyData.prescriptions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <FontAwesome name="medkit" size={60} color="#bdc3c7" />
                      <Text style={styles.emptyText}>No prescriptions found</Text>
                    </View>
                  ) : (
                    historyData.prescriptions.map(renderPrescription)
                  )}
                </View>
              )}

              {activeTab === 'medical-notes' && (
                <View style={styles.tabContent}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Medical Notes</Text>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => setMedicalNotesModalVisible(true)}
                    >
                      <FontAwesome name="plus" size={16} color="#fff" />
                      <Text style={styles.addButtonText}>Add Note</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {medicalNotesLoading ? (
                    <View style={styles.loadingContainer}>
                      <FontAwesome name="spinner" size={30} color="#3498db" />
                      <Text style={styles.loadingText}>Loading medical notes...</Text>
                    </View>
                  ) : medicalNotes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <FontAwesome name="stethoscope" size={60} color="#bdc3c7" />
                      <Text style={styles.emptyText}>No medical notes found</Text>
                      <Text style={styles.emptySubtext}>Add medical notes to track patient's medical history</Text>
                    </View>
                  ) : (
                    medicalNotes.map(renderMedicalNote)
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

      {/* Medical Notes Modal */}
      <MedicalNotesModal
        visible={medicalNotesModalVisible}
        onClose={() => setMedicalNotesModalVisible(false)}
        patientId={patientIdNum}
        patientName={patientNameStr}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  placeholder: {
    width: 34,
  },
  patientInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  patientDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  patientSince: {
    fontSize: 12,
    color: '#95a5a6',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
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
  errorContainer: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 15,
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentDate: {
    flex: 1,
  },
  appointmentDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  appointmentTimeText: {
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
    flex: 1,
  },
  appointmentType: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 5,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 10,
  },
  symptomsContainer: {
    marginBottom: 10,
  },
  symptomsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 5,
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomTag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
    marginBottom: 5,
  },
  symptomText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  notesContainer: {
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
    fontStyle: 'italic',
  },
  facilityText: {
    fontSize: 12,
    color: '#95a5a6',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  prescriptionDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  prescriptionDetails: {
    flex: 1,
  },
  prescriptionRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  prescriptionLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    width: 80,
  },
  prescriptionValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  instructionsContainer: {
    marginTop: 10,
  },
  instructionsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 5,
  },
  instructionsText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  profileContainer: {
    flex: 1,
  },
  profileSection: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 8,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileItem: {
    width: '48%',
    marginBottom: 15,
  },
  profileLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 5,
  },
  profileValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  medicalTag: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  medicalTagText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  allergyTag: {
    backgroundColor: '#fdf2e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  allergyTagText: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '500',
  },
  // Medical Notes Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  medicalNoteCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medicalNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  medicalNoteDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  medicalNoteAppointment: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  medicalNoteContent: {
    gap: 10,
  },
  medicalNoteSection: {
    marginBottom: 8,
  },
  medicalNoteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicalNoteText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
