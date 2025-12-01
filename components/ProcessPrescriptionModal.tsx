import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { pharmacistPrescriptionService, PharmacistPrescription } from '../services/pharmacistPrescriptionService';
import { medicinesService } from '../services/medicinesService';

const { width } = Dimensions.get('window');

interface ProcessPrescriptionModalProps {
  visible: boolean;
  prescriptionId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProcessPrescriptionModal({
  visible,
  prescriptionId,
  onClose,
  onSuccess,
}: ProcessPrescriptionModalProps) {
  const [prescription, setPrescription] = useState<PharmacistPrescription | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [inventoryStatus, setInventoryStatus] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<{ valid: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (visible && prescriptionId) {
      loadPrescriptionDetails();
      checkInventory();
      verifyPrescription();
    } else {
      // Reset state when modal closes
      setPrescription(null);
      setNotes('');
      setInventoryStatus(null);
      setVerificationStatus(null);
    }
  }, [visible, prescriptionId]);

  const loadPrescriptionDetails = async () => {
    if (!prescriptionId) return;

    try {
      setLoading(true);
      const response = await pharmacistPrescriptionService.getPrescriptionById(prescriptionId);
      
      if (response.success && response.data) {
        setPrescription(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to load prescription details');
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
      Alert.alert('Error', 'Failed to load prescription details');
    } finally {
      setLoading(false);
    }
  };

  const verifyPrescription = async () => {
    if (!prescriptionId) return;

    try {
      const response = await pharmacistPrescriptionService.verifyPrescription(prescriptionId);
      
      if (response.success && response.data) {
        setVerificationStatus(response.data);
      }
    } catch (error) {
      console.error('Error verifying prescription:', error);
    }
  };

  const checkInventory = async () => {
    if (!prescriptionId) return;

    try {
      const response = await pharmacistPrescriptionService.checkInventory(prescriptionId);
      
      if (response.success && response.data) {
        setInventoryStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
    }
  };

  const handleProcessPrescription = async () => {
    if (!prescriptionId) return;

    if (!verificationStatus?.valid) {
      Alert.alert('Cannot Process', 'Prescription verification failed. Please verify the prescription first.');
      return;
    }

    Alert.alert(
      'Process Prescription',
      'Are you sure you want to mark this prescription as filled?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            try {
              setProcessing(true);
              
              const response = await pharmacistPrescriptionService.processPrescription({
                prescriptionId,
                filled: true,
                notes: notes.trim() || undefined,
              });

              if (response.success) {
                Alert.alert('Success', 'Prescription processed successfully!', [
                  { text: 'OK', onPress: () => {
                    onSuccess();
                    onClose();
                  }},
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to process prescription');
              }
            } catch (error) {
              console.error('Error processing prescription:', error);
              Alert.alert('Error', 'Failed to process prescription. Please try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Process Prescription</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#1a1f3a" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#d4af37" />
              <Text style={styles.loadingText}>Loading prescription...</Text>
            </View>
          ) : prescription ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Verification Status */}
              {verificationStatus && (
                <View style={[
                  styles.statusCard,
                  verificationStatus.valid ? styles.validCard : styles.invalidCard
                ]}>
                  <FontAwesome
                    name={verificationStatus.valid ? 'check-circle' : 'exclamation-circle'}
                    size={20}
                    color={verificationStatus.valid ? '#2ecc71' : '#e74c3c'}
                  />
                  <Text style={[
                    styles.statusText,
                    verificationStatus.valid ? styles.validText : styles.invalidText
                  ]}>
                    {verificationStatus.valid
                      ? 'Prescription Verified ✓'
                      : `Verification Failed: ${verificationStatus.message || 'Invalid prescription'}`
                    }
                  </Text>
                </View>
              )}

              {/* Patient Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Patient Information</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{prescription.patientName}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{prescription.patientEmail}</Text>
                </View>
              </View>

              {/* Doctor Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prescribed By</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.infoValue}>{prescription.doctorName}</Text>
                </View>
              </View>

              {/* Medication Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medication Details</Text>
                <View style={styles.medicationCard}>
                  <Text style={styles.medicationName}>{prescription.medicationName}</Text>
                  <View style={styles.medicationDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dosage:</Text>
                      <Text style={styles.detailValue}>{prescription.dosage}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Frequency:</Text>
                      <Text style={styles.detailValue}>{prescription.frequency}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{prescription.duration}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quantity:</Text>
                      <Text style={styles.detailValue}>{prescription.quantity}</Text>
                    </View>
                    {prescription.refills > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Refills:</Text>
                        <Text style={styles.detailValue}>{prescription.refills}</Text>
                      </View>
                    )}
                  </View>
                  {prescription.instructions && (
                    <View style={styles.instructionsContainer}>
                      <Text style={styles.instructionsLabel}>Instructions:</Text>
                      <Text style={styles.instructionsText}>{prescription.instructions}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Inventory Status */}
              {inventoryStatus && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Inventory Status</Text>
                  <View style={[
                    styles.inventoryCard,
                    inventoryStatus.available ? styles.availableCard : styles.unavailableCard
                  ]}>
                    <FontAwesome
                      name={inventoryStatus.available ? 'check-circle' : 'exclamation-triangle'}
                      size={20}
                      color={inventoryStatus.available ? '#2ecc71' : '#f39c12'}
                    />
                    <Text style={styles.inventoryText}>
                      {inventoryStatus.available
                        ? `In Stock (${inventoryStatus.quantity} available)`
                        : inventoryStatus.message || 'Out of Stock'
                      }
                    </Text>
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Processing Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any notes about processing this prescription..."
                  placeholderTextColor="#95a5a6"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.processButton,
                    (!verificationStatus?.valid || processing) && styles.processButtonDisabled
                  ]}
                  onPress={handleProcessPrescription}
                  disabled={!verificationStatus?.valid || processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="check" size={16} color="#fff" />
                      <Text style={styles.processButtonText}>Process & Fill</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
              <Text style={styles.errorText}>Failed to load prescription</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPrescriptionDetails}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1f3a',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7a7a7a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  validCard: {
    backgroundColor: '#d4edda',
  },
  invalidCard: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  validText: {
    color: '#155724',
  },
  invalidText: {
    color: '#721c24',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#f8f9fb',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7a7a7a',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1f3a',
    fontWeight: '500',
  },
  medicationCard: {
    backgroundColor: '#f8f9fb',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 12,
  },
  medicationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1f3a',
    fontWeight: '600',
  },
  instructionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  instructionsLabel: {
    fontSize: 12,
    color: '#7a7a7a',
    marginBottom: 6,
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1a1f3a',
    lineHeight: 20,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  availableCard: {
    backgroundColor: '#d4edda',
  },
  unavailableCard: {
    backgroundColor: '#fff3cd',
  },
  inventoryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#155724',
  },
  notesInput: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1f3a',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  processButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#d4af37',
    gap: 8,
  },
  processButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d4af37',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

