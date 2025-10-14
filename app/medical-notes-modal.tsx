import React, { useState, useEffect, useRef } from 'react';
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
// Removed DateTimePicker import - using custom date picker instead
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doctorDashboardService } from '../services/doctorDashboardService';

interface MedicalNotesModalProps {
  visible: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  appointmentId?: number;
}

interface MedicalNoteFormData {
  diagnosis: string;
  symptoms: string;
  treatment: string;
  medications: string;
  notes: string;
  followUpDate: string;
  followUpNotes: string;
}

export default function MedicalNotesModal({ 
  visible, 
  onClose, 
  patientId, 
  patientName,
  appointmentId 
}: MedicalNotesModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MedicalNoteFormData>({
    diagnosis: '',
    symptoms: '',
    treatment: '',
    medications: '',
    notes: '',
    followUpDate: '',
    followUpNotes: ''
  });

  const [errors, setErrors] = useState<Partial<MedicalNoteFormData>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setFormData({
        diagnosis: '',
        symptoms: '',
        treatment: '',
        medications: '',
        notes: '',
        followUpDate: '',
        followUpNotes: ''
      });
      setErrors({});
    }
  }, [visible]);

  const validateForm = () => {
    let newErrors: Partial<MedicalNoteFormData> = {};
    
    if (!formData.diagnosis.trim()) {
      newErrors.diagnosis = 'Diagnosis is required';
    }
    if (!formData.symptoms.trim()) {
      newErrors.symptoms = 'Symptoms are required';
    }
    if (!formData.treatment.trim()) {
      newErrors.treatment = 'Treatment plan is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MedicalNoteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputFocus = (field: keyof MedicalNoteFormData) => {
    // Scroll to the focused input
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };


  const showDatePickerModal = () => {
    // Initialize with current form date or today + 1 day
    const currentDate = formData.followUpDate ? new Date(formData.followUpDate) : (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })();
    setTempDate(currentDate);
    setShowDatePicker(true);
  };

  const handleDatePickerDone = () => {
    console.log('🔍 Date picker done, tempDate:', tempDate);
    const dateString = tempDate.toISOString().split('T')[0];
    console.log('✅ Setting form date to:', dateString);
    setSelectedDate(tempDate);
    setFormData(prev => ({ 
      ...prev, 
      followUpDate: dateString
    }));
    setShowDatePicker(false);
  };

  const handleDateChange = (field: 'year' | 'month' | 'day', value: number) => {
    const newDate = new Date(tempDate);
    if (field === 'year') {
      newDate.setFullYear(value);
    } else if (field === 'month') {
      newDate.setMonth(value - 1); // Month is 0-indexed
    } else if (field === 'day') {
      newDate.setDate(value);
    }
    setTempDate(newDate);
  };

  const generateDateOptions = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const years = [];
    const months = [];
    const days = [];

    // Generate years (current year to 5 years ahead)
    for (let year = currentYear; year <= currentYear + 5; year++) {
      years.push(year);
    }

    // Generate months
    for (let month = 1; month <= 12; month++) {
      months.push(month);
    }

    // Generate days based on selected month/year
    const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return { years, months, days };
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    // Don't update any state, just close the modal
  };

  const clearFollowUpDate = () => {
    setFormData(prev => ({ ...prev, followUpDate: '' }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const medicalNoteData = {
        patientId,
        appointmentId,
        diagnosis: formData.diagnosis.trim(),
        symptoms: formData.symptoms.trim(),
        treatment: formData.treatment.trim(),
        medications: formData.medications.trim(),
        notes: formData.notes.trim(),
        followUpDate: formData.followUpDate.trim(),
        followUpNotes: formData.followUpNotes.trim(),
      };

      const response = await doctorDashboardService.addMedicalNote(medicalNoteData);

      console.log('🔍 MedicalNotesModal - Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        Alert.alert('Success', 'Medical notes added successfully!', [{ text: 'OK', onPress: onClose }]);
      } else {
        Alert.alert('Error', response.message || 'Failed to add medical notes. Please try again.', [{ text: 'OK' }]);
      }
    } catch (error: any) {
      console.error('❌ MedicalNotesModal - Error adding medical notes:', error);
      Alert.alert('Error', error.message || 'Failed to add medical notes. Please try again.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof MedicalNoteFormData,
    placeholder: string,
    multiline: boolean = false,
    required: boolean = true
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required && '*'}
      </Text>
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
        numberOfLines={multiline ? 4 : 1}
        editable={!loading}
        returnKeyType={multiline ? 'default' : 'next'}
        blurOnSubmit={!multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Medical Notes</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times-circle" size={24} color="#7f8c8d" />
          </TouchableOpacity>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>Patient: {patientName}</Text>
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
            'Diagnosis',
            'diagnosis',
            'e.g., Hypertension, Diabetes Type 2, Common Cold'
          )}
          
          {renderInput(
            'Symptoms',
            'symptoms',
            'e.g., Headache, Fever, Nausea, Fatigue',
            true
          )}
          
          {renderInput(
            'Treatment Plan',
            'treatment',
            'e.g., Rest, Medication, Physical therapy, Surgery'
          )}
          
          {renderInput(
            'Medications Prescribed',
            'medications',
            'e.g., Amoxicillin 500mg, Paracetamol 1000mg',
            true,
            false
          )}
          
          {renderInput(
            'Additional Notes',
            'notes',
            'Any additional observations or recommendations',
            true,
            false
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Follow-up Date</Text>
            <View style={styles.datePickerContainer}>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={showDatePickerModal}
              >
                <Text style={[styles.datePickerText, formData.followUpDate && styles.datePickerTextSelected]}>
                  {formData.followUpDate ? new Date(formData.followUpDate).toLocaleDateString() : 'Select follow-up date'}
                </Text>
                <FontAwesome name="calendar" size={16} color="#3498db" />
              </TouchableOpacity>
              {formData.followUpDate && (
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={clearFollowUpDate}
                >
                  <FontAwesome name="times" size={14} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {renderInput(
            'Follow-up Instructions',
            'followUpNotes',
            'Instructions for follow-up care',
            true,
            false
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Medical Notes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerCancelButton}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Follow-up Date</Text>
                <TouchableOpacity 
                  onPress={handleDatePickerDone}
                  style={styles.datePickerDoneButton}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.customDatePicker}>
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Day</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                    {generateDateOptions().days.map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerOption,
                          tempDate.getDate() === day && styles.datePickerOptionSelected
                        ]}
                        onPress={() => handleDateChange('day', day)}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          tempDate.getDate() === day && styles.datePickerOptionTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Month</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                    {generateDateOptions().months.map((month) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.datePickerOption,
                          tempDate.getMonth() + 1 === month && styles.datePickerOptionSelected
                        ]}
                        onPress={() => handleDateChange('month', month)}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          tempDate.getMonth() + 1 === month && styles.datePickerOptionTextSelected
                        ]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Year</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                    {generateDateOptions().years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerOption,
                          tempDate.getFullYear() === year && styles.datePickerOptionSelected
                        ]}
                        onPress={() => handleDateChange('year', year)}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          tempDate.getFullYear() === year && styles.datePickerOptionTextSelected
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 12,
    marginTop: 5,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a0d4a0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    marginRight: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  datePickerTextSelected: {
    color: '#2c3e50',
  },
  clearDateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  // Date Picker Modal Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerCancelButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  datePickerCancelText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '500',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  datePickerDoneButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#3498db',
  },
  datePickerDoneText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
    backgroundColor: '#fff',
  },
  customDatePicker: {
    flexDirection: 'row',
    height: 200,
    paddingHorizontal: 20,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  datePickerScroll: {
    flex: 1,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerOptionSelected: {
    backgroundColor: '#007AFF',
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#666',
  },
  datePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
