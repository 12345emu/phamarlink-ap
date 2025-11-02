import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doctorDashboardService } from '../services/doctorDashboardService';

interface Patient {
  id: number;
  name: string;
  email: string;
}

interface CreatePrescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePrescriptionModal({ 
  visible, 
  onClose, 
  onSuccess 
}: CreatePrescriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientList, setShowPatientList] = useState(false);
  
  // Prescription form data
  const [formData, setFormData] = useState({
    patientId: '',
    appointmentId: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: '1',
    refills: '0',
    notes: ''
  });

  useEffect(() => {
    if (visible) {
      loadPatients();
    }
  }, [visible]);

  const loadPatients = async () => {
    try {
      console.log('🔍 CreatePrescriptionModal - Loading patients');
      const response = await doctorDashboardService.getPatients(50, 1);
      
      if (response.patients) {
        const mappedPatients = response.patients.map((patient: any) => ({
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          email: patient.email
        }));
        setPatients(mappedPatients);
        console.log('✅ CreatePrescriptionModal - Patients loaded:', mappedPatients.length);
      }
    } catch (error) {
      console.error('❌ CreatePrescriptionModal - Error loading patients:', error);
      Alert.alert('Error', 'Failed to load patients. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientId: patient.id.toString()
    }));
    setShowPatientList(false);
  };

  const validateForm = () => {
    if (!formData.patientId || !formData.medicationName || !formData.dosage || !formData.frequency || !formData.duration) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log('🔍 CreatePrescriptionModal - Creating prescription:', formData);
      
      const prescriptionData = {
        patientId: parseInt(formData.patientId),
        appointmentId: formData.appointmentId ? parseInt(formData.appointmentId) : null,
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions,
        quantity: parseInt(formData.quantity),
        refills: parseInt(formData.refills)
      };

      const response = await doctorDashboardService.createPrescription(prescriptionData);
      
      if (response) {
        console.log('✅ CreatePrescriptionModal - Prescription created successfully');
        Alert.alert(
          'Success', 
          'Prescription created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                handleClose();
              }
            }
          ]
        );
      } else {
        throw new Error('Failed to create prescription');
      }
    } catch (error) {
      console.error('❌ CreatePrescriptionModal - Error creating prescription:', error);
      Alert.alert('Error', 'Failed to create prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      patientId: '',
      appointmentId: '',
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: '1',
      refills: '0',
      notes: ''
    });
    setSelectedPatient(null);
    setShowPatientList(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Prescription</Text>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#3498db" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Patient Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient *</Text>
            <TouchableOpacity
              style={styles.patientSelector}
              onPress={() => setShowPatientList(!showPatientList)}
            >
              <Text style={[styles.patientSelectorText, !selectedPatient && styles.placeholderText]}>
                {selectedPatient ? selectedPatient.name : 'Select Patient'}
              </Text>
              <FontAwesome name="chevron-down" size={16} color="#7f8c8d" />
            </TouchableOpacity>
            
            {showPatientList && (
              <View style={styles.patientList}>
                {patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={styles.patientItem}
                    onPress={() => handlePatientSelect(patient)}
                  >
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientEmail}>{patient.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Medication Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medication Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medication Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.medicationName}
                onChangeText={(value) => handleInputChange('medicationName', value)}
                placeholder="Enter medication name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dosage *</Text>
              <TextInput
                style={styles.input}
                value={formData.dosage}
                onChangeText={(value) => handleInputChange('dosage', value)}
                placeholder="e.g., 500mg, 10ml"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency *</Text>
              <TextInput
                style={styles.input}
                value={formData.frequency}
                onChangeText={(value) => handleInputChange('frequency', value)}
                placeholder="e.g., Twice daily, Every 8 hours"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration *</Text>
              <TextInput
                style={styles.input}
                value={formData.duration}
                onChangeText={(value) => handleInputChange('duration', value)}
                placeholder="e.g., 7 days, 2 weeks"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.instructions}
                onChangeText={(value) => handleInputChange('instructions', value)}
                placeholder="Special instructions for the patient"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={formData.quantity}
                  onChangeText={(value) => handleInputChange('quantity', value)}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Refills</Text>
                <TextInput
                  style={styles.input}
                  value={formData.refills}
                  onChangeText={(value) => handleInputChange('refills', value)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Additional Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              placeholder="Any additional notes or comments"
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  patientSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  patientSelectorText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  placeholderText: {
    color: '#7f8c8d',
  },
  patientList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
  },
  patientItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  halfInput: {
    flex: 1,
  },
});
