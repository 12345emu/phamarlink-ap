import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Modal, Image, ActivityIndicator, RefreshControl } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { prescriptionsService, Prescription, PrescriptionMedicine } from '../services/prescriptionsService';
import * as ImagePicker from 'expo-image-picker';

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';
const BACKGROUND = '#f8f9fa';

export default function PrescriptionsModal() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showPrescriptionDetail, setShowPrescriptionDetail] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch prescriptions
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptionsService.getPrescriptions({
        search: searchQuery || undefined,
        limit: 50
      });

      if (response.success && response.data) {
        setPrescriptions(response.data);
        console.log('✅ Prescriptions fetched successfully:', response.data.length);
      } else {
        console.error('❌ Failed to fetch prescriptions:', response.message);
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('❌ Error fetching prescriptions:', error);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions();
    setRefreshing(false);
  };

  // Handle search
  const handleSearch = async () => {
    await fetchPrescriptions();
  };

  // Handle prescription selection
  const handlePrescriptionSelect = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionDetail(true);
  };

  // Handle upload prescription
  const handleUploadPrescription = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permission to upload prescriptions.');
        return;
      }

      // Show image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        setIsUploading(true);
        
        // Convert image to base64 or upload directly
        const response = await prescriptionsService.uploadPrescription({
          image: imageUri,
          description: uploadDescription.trim() || undefined
        });

        if (response.success) {
          Alert.alert('Success', 'Prescription uploaded successfully!');
          setUploadModalVisible(false);
          setUploadDescription('');
          await fetchPrescriptions(); // Refresh the list
        } else {
          Alert.alert('Error', response.message || 'Failed to upload prescription');
        }
      }
    } catch (error) {
      console.error('❌ Error uploading prescription:', error);
      Alert.alert('Error', 'Failed to upload prescription');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const renderPrescriptionCard = (prescription: Prescription) => (
    <TouchableOpacity
      key={prescription.id}
      style={styles.prescriptionCard}
      onPress={() => handlePrescriptionSelect(prescription)}
      activeOpacity={0.7}
    >
      <View style={styles.prescriptionHeader}>
        <View style={styles.prescriptionInfo}>
          <Text style={styles.doctorName}>{prescription.doctor_name}</Text>
          <Text style={styles.facilityName}>{prescription.facility_name}</Text>
        </View>
        <View style={styles.prescriptionDate}>
          <Text style={styles.dateText}>
            {prescriptionsService.formatPrescriptionDate(prescription.appointment_date)}
          </Text>
        </View>
      </View>
      
      {prescription.diagnosis && (
        <View style={styles.diagnosisContainer}>
          <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
          <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
        </View>
      )}

      {prescription.medicines && prescription.medicines.length > 0 && (
        <View style={styles.medicinesContainer}>
          <Text style={styles.medicinesLabel}>
            {prescription.medicines.length} Medicine{prescription.medicines.length > 1 ? 's' : ''}
          </Text>
          <View style={styles.medicinesList}>
            {prescription.medicines.slice(0, 2).map((medicine, index) => (
              <Text key={index} style={styles.medicineItem}>
                • {medicine.medicine_name} ({medicine.dosage})
              </Text>
            ))}
            {prescription.medicines.length > 2 && (
              <Text style={styles.moreMedicines}>
                +{prescription.medicines.length - 2} more
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.prescriptionFooter}>
        <FontAwesome name="chevron-right" size={16} color="#95a5a6" />
      </View>
    </TouchableOpacity>
  );

  const renderPrescriptionDetail = () => {
    if (!selectedPrescription) return null;

    return (
      <Modal
        visible={showPrescriptionDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrescriptionDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prescription Details</Text>
              <TouchableOpacity
                onPress={() => setShowPrescriptionDetail(false)}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={20} color="#95a5a6" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Doctor Information</Text>
                <Text style={styles.detailText}>Dr. {selectedPrescription.doctor_name}</Text>
                <Text style={styles.detailSubText}>{selectedPrescription.facility_name}</Text>
                <Text style={styles.detailSubText}>
                  {prescriptionsService.formatPrescriptionDate(selectedPrescription.appointment_date)}
                </Text>
              </View>

              {selectedPrescription.diagnosis && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Diagnosis</Text>
                  <Text style={styles.detailText}>{selectedPrescription.diagnosis}</Text>
                </View>
              )}

              {selectedPrescription.prescription_text && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Prescription</Text>
                  <Text style={styles.detailText}>{selectedPrescription.prescription_text}</Text>
                </View>
              )}

              {selectedPrescription.medicines && selectedPrescription.medicines.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Medicines</Text>
                  {selectedPrescription.medicines.map((medicine, index) => (
                    <View key={index} style={styles.medicineCard}>
                      <Text style={styles.medicineName}>{medicine.medicine_name}</Text>
                      {medicine.generic_name && (
                        <Text style={styles.medicineGeneric}>({medicine.generic_name})</Text>
                      )}
                      <View style={styles.medicineDetails}>
                        <Text style={styles.medicineDetail}>
                          <Text style={styles.medicineLabel}>Dosage:</Text> {medicine.dosage}
                        </Text>
                        <Text style={styles.medicineDetail}>
                          <Text style={styles.medicineLabel}>Frequency:</Text> {medicine.frequency}
                        </Text>
                        <Text style={styles.medicineDetail}>
                          <Text style={styles.medicineLabel}>Duration:</Text> {medicine.duration}
                        </Text>
                        {medicine.quantity && (
                          <Text style={styles.medicineDetail}>
                            <Text style={styles.medicineLabel}>Quantity:</Text> {medicine.quantity}
                          </Text>
                        )}
                      </View>
                      {medicine.instructions && (
                        <Text style={styles.medicineInstructions}>
                          <Text style={styles.medicineLabel}>Instructions:</Text> {medicine.instructions}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {selectedPrescription.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.detailText}>{selectedPrescription.notes}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderUploadModal = () => (
    <Modal
      visible={uploadModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setUploadModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Prescription</Text>
            <TouchableOpacity
              onPress={() => setUploadModalVisible(false)}
              style={styles.closeButton}
            >
              <FontAwesome name="times" size={20} color="#95a5a6" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.uploadDescription}>
              Upload a photo of your prescription to keep it on record.
            </Text>

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={uploadDescription}
              onChangeText={setUploadDescription}
              placeholder="Add a description for this prescription..."
              multiline={true}
              numberOfLines={3}
              maxLength={200}
            />

            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              onPress={handleUploadPrescription}
              disabled={isUploading}
            >
              {isUploading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                </View>
              ) : (
                <View style={styles.uploadButtonContent}>
                  <FontAwesome name="camera" size={20} color="white" />
                  <Text style={styles.uploadButtonText}>Choose Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome name="arrow-left" size={20} color={ACCENT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
        <TouchableOpacity
          onPress={() => setUploadModalVisible(true)}
          style={styles.floatingUploadButton}
        >
          <FontAwesome name="plus" size={20} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color="#95a5a6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search prescriptions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              fetchPrescriptions();
            }}>
              <FontAwesome name="times-circle" size={16} color="#95a5a6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ACCENT]}
            tintColor={ACCENT}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading prescriptions...</Text>
          </View>
        ) : prescriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="file-text-o" size={48} color="#95a5a6" />
            <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No prescriptions match your search.' : 'You don\'t have any prescriptions yet.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.uploadFirstButton}
                onPress={() => setUploadModalVisible(true)}
              >
                <FontAwesome name="plus" size={16} color="white" />
                <Text style={styles.uploadFirstButtonText}>Upload Your First Prescription</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          prescriptions.map(renderPrescriptionCard)
        )}
      </ScrollView>

      {renderPrescriptionDetail()}
      {renderUploadModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  floatingUploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  prescriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  facilityName: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  prescriptionDate: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  diagnosisContainer: {
    marginBottom: 12,
  },
  diagnosisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  diagnosisText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  medicinesContainer: {
    marginBottom: 12,
  },
  medicinesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 6,
  },
  medicinesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  medicineItem: {
    fontSize: 13,
    color: '#2c3e50',
    marginRight: 12,
    marginBottom: 2,
  },
  moreMedicines: {
    fontSize: 13,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  prescriptionFooter: {
    alignItems: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadFirstButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  detailSubText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 4,
  },
  medicineCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicineGeneric: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  medicineDetails: {
    marginBottom: 8,
  },
  medicineDetail: {
    fontSize: 13,
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicineLabel: {
    fontWeight: '600',
    color: '#7f8c8d',
  },
  medicineInstructions: {
    fontSize: 13,
    color: '#2c3e50',
    fontStyle: 'italic',
  },
  // Upload modal styles
  uploadDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  uploadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
