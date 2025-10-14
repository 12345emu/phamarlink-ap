import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doctorDashboardService } from '../services/doctorDashboardService';

interface PrescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  appointmentId?: number;
}

interface PrescriptionFormData {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
  refills: string;
}

export default function PrescriptionModal({ 
  visible, 
  onClose, 
  patientId, 
  patientName, 
  appointmentId 
}: PrescriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PrescriptionFormData>({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: '1',
    refills: '0'
  });

  const [errors, setErrors] = useState<Partial<PrescriptionFormData>>({});
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setFormData({
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: '1',
        refills: '0'
      });
      setErrors({});
    }
  }, [visible]);

  const validateForm = (): boolean => {
    const newErrors: Partial<PrescriptionFormData> = {};

    if (!formData.medicationName.trim()) {
      newErrors.medicationName = 'Medication name is required';
    }
    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    }
    if (!formData.frequency.trim()) {
      newErrors.frequency = 'Frequency is required';
    }
    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof PrescriptionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputFocus = (field: keyof PrescriptionFormData) => {
    // Scroll to the focused input, especially for the instructions field
    if (field === 'instructions' && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const prescriptionData = {
        patientId,
        appointmentId,
        medicationName: formData.medicationName.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequency.trim(),
        duration: formData.duration.trim(),
        instructions: formData.instructions.trim(),
        quantity: parseInt(formData.quantity) || 1,
        refills: parseInt(formData.refills) || 0
      };

      console.log('🔍 PrescriptionModal - Creating prescription:', prescriptionData);
      
      const result = await doctorDashboardService.createPrescription(prescriptionData);
      
      console.log('✅ PrescriptionModal - Prescription created successfully:', result);
      
      Alert.alert(
        'Success',
        'Prescription created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ PrescriptionModal - Error creating prescription:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create prescription. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof PrescriptionFormData,
    placeholder: string,
    multiline: boolean = false,
    keyboardType: 'default' | 'numeric' = 'default'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label} *</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          errors[field] && styles.inputError
        ]}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        onFocus={() => handleInputFocus(field)}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        editable={!loading}
        returnKeyType={multiline ? 'default' : 'next'}
        blurOnSubmit={!multiline}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Prescription</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times-circle" size={24} color="#7f8c8d" />
          </TouchableOpacity>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>For: {patientName}</Text>
          {appointmentId && (
            <Text style={styles.appointmentInfo}>Appointment ID: {appointmentId}</Text>
          )}
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {renderInput(
            'Medication Name',
            'medicationName',
            'e.g., Amoxicillin, Paracetamol'
          )}

          {renderInput(
            'Dosage',
            'dosage',
            'e.g., 500mg, 2 tablets'
          )}

          {renderInput(
            'Frequency',
            'frequency',
            'e.g., Twice daily, Every 8 hours'
          )}

          {renderInput(
            'Duration',
            'duration',
            'e.g., 7 days, 2 weeks'
          )}

          {renderInput(
            'Instructions',
            'instructions',
            'Special instructions for the patient...',
            true
          )}

          <View style={styles.row}>
            {renderInput(
              'Quantity',
              'quantity',
              '1',
              false,
              'numeric'
            )}

            {renderInput(
              'Refills',
              'refills',
              '0',
              false,
              'numeric'
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Prescription</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 5,
  },
  patientInfo: {
    padding: 15,
    backgroundColor: '#eaf4f7',
    borderBottomWidth: 1,
    borderBottomColor: '#d0e0e3',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  appointmentInfo: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#27ae60',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
