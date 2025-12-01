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
  Image,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { medicinesService, Medicine } from '../services/medicinesService';
import { pharmacistInventoryService, AddMedicineToInventoryData } from '../services/pharmacistInventoryService';
import { API_CONFIG } from '../constants/API';

interface AddMedicineToInventoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMedicineId?: number;
}

export default function AddMedicineToInventoryModal({
  visible,
  onClose,
  onSuccess,
  initialMedicineId,
}: AddMedicineToInventoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [expiryDateValue, setExpiryDateValue] = useState<Date>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  });
  const [tempExpiryDate, setTempExpiryDate] = useState<Date>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  });
  const [batchNumber, setBatchNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // New medicine form fields
  const [newMedicineName, setNewMedicineName] = useState('');
  const [newMedicineGenericName, setNewMedicineGenericName] = useState('');
  const [newMedicineBrandName, setNewMedicineBrandName] = useState('');
  const [newMedicineCategory, setNewMedicineCategory] = useState('other');
  const [newMedicineDosageForm, setNewMedicineDosageForm] = useState('tablet');
  const [newMedicineStrength, setNewMedicineStrength] = useState('');
  const [newMedicineManufacturer, setNewMedicineManufacturer] = useState('');
  const [newMedicineDescription, setNewMedicineDescription] = useState('');
  const [newMedicineActiveIngredients, setNewMedicineActiveIngredients] = useState('');
  const [newMedicineSideEffects, setNewMedicineSideEffects] = useState('');
  const [newMedicineContraindications, setNewMedicineContraindications] = useState('');
  const [newMedicinePrescriptionRequired, setNewMedicinePrescriptionRequired] = useState(false);
  const [newMedicineImage, setNewMedicineImage] = useState<string | null>(null);
  const [creatingMedicine, setCreatingMedicine] = useState(false);

  useEffect(() => {
    if (visible && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchMedicines();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setMedicines([]);
    }
  }, [searchQuery, visible]);

  useEffect(() => {
    if (visible) {
      if (searchQuery.trim()) {
        searchMedicines();
      }
    } else {
      // Reset form when modal closes
      setSearchQuery('');
      setSelectedMedicine(null);
      setStockQuantity('');
      setPrice('');
      setDiscountPrice('');
      setExpiryDate('');
      setBatchNumber('');
      setMedicines([]);
      setShowCreateForm(false);
      setNewMedicineName('');
      setNewMedicineGenericName('');
      setNewMedicineBrandName('');
      setNewMedicineCategory('other');
      setNewMedicineDosageForm('tablet');
      setNewMedicineStrength('');
      setNewMedicineManufacturer('');
      setNewMedicineDescription('');
      setNewMedicineActiveIngredients('');
      setNewMedicineSideEffects('');
      setNewMedicineContraindications('');
      setNewMedicinePrescriptionRequired(false);
      setNewMedicineImage(null);
    }
  }, [visible]);

  // Handle initial medicine ID (from barcode scanner)
  useEffect(() => {
    if (visible && initialMedicineId) {
      // Try to find the medicine in the medicines list first
      const foundMedicine = medicines.find(m => parseInt(m.id.toString()) === initialMedicineId);
      if (foundMedicine) {
        handleSelectMedicine(foundMedicine);
      } else {
        // If not in list, fetch it directly
        medicinesService.getMedicineById(initialMedicineId.toString())
          .then((response) => {
            if (response.success && response.data) {
              handleSelectMedicine(response.data);
            }
          })
          .catch((error) => {
            console.error('Error loading initial medicine:', error);
          });
      }
    }
  }, [visible, initialMedicineId]);

  const searchMedicines = async () => {
    if (!searchQuery.trim()) {
      setMedicines([]);
      return;
    }

    try {
      setSearching(true);
      const response = await medicinesService.getMedicines({
        search: searchQuery,
        limit: 20,
      });

      if (response.success && response.data) {
        setMedicines(response.data);
      }
    } catch (error) {
      console.error('Error searching medicines:', error);
      Alert.alert('Error', 'Failed to search medicines');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setSearchQuery(medicine.name);
    setMedicines([]);
  };

  const pickMedicineImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setNewMedicineImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeMedicineImage = () => {
    setNewMedicineImage(null);
  };

  const handleCreateNewMedicine = async () => {
    if (!newMedicineName.trim()) {
      Alert.alert('Error', 'Please enter medicine name');
      return;
    }

    if (!stockQuantity || parseInt(stockQuantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid stock quantity');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setCreatingMedicine(true);
      
      // Get facility ID
      console.log('🔍 Getting facility ID for new medicine creation...');
      const facilityId = await pharmacistInventoryService.getPharmacistFacilityId();
      console.log('🔍 Facility ID result:', facilityId);
      
      if (!facilityId) {
        Alert.alert(
          'Facility Not Found', 
          'Unable to determine your pharmacy facility. Please ensure:\n\n1. You are registered as a pharmacist\n2. Your account is linked to a pharmacy facility\n3. Contact support if the issue persists',
          [{ text: 'OK' }]
        );
        setCreatingMedicine(false);
        return;
      }

      // Create FormData for medicine creation with image
      const formData = new FormData();
      formData.append('name', newMedicineName.trim());
      if (newMedicineGenericName.trim()) {
        formData.append('generic_name', newMedicineGenericName.trim());
      }
      if (newMedicineBrandName.trim()) {
        formData.append('brand_name', newMedicineBrandName.trim());
      }
      formData.append('category', newMedicineCategory);
      formData.append('prescription_required', newMedicinePrescriptionRequired.toString());
      formData.append('dosage_form', newMedicineDosageForm);
      if (newMedicineStrength.trim()) {
        formData.append('strength', newMedicineStrength.trim());
      }
      if (newMedicineManufacturer.trim()) {
        formData.append('manufacturer', newMedicineManufacturer.trim());
      }
      if (newMedicineDescription.trim()) {
        formData.append('description', newMedicineDescription.trim());
      }
      if (newMedicineActiveIngredients.trim()) {
        formData.append('active_ingredients', newMedicineActiveIngredients.trim());
      }
      if (newMedicineSideEffects.trim()) {
        formData.append('side_effects', newMedicineSideEffects.trim());
      }
      if (newMedicineContraindications.trim()) {
        formData.append('contraindications', newMedicineContraindications.trim());
      }
      
      // Add image if selected
      if (newMedicineImage) {
        const filename = newMedicineImage.split('/').pop() || 'medicine.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('image', {
          uri: newMedicineImage,
          type: type,
          name: filename,
        } as any);
      }

      // First, create the medicine in the database using direct axios for FormData
      const token = await AsyncStorage.getItem('userToken');
      
      const createResponse = await axios.post(
        `${API_CONFIG.BASE_URL}/medicines`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!createResponse.data.success || !createResponse.data.data) {
        Alert.alert('Error', createResponse.data.message || 'Failed to create medicine');
        return;
      }

      const newMedicineId = createResponse.data.data.id;

      // Then, add it to the pharmacy
      const addRequestData: any = {
        medicine_id: newMedicineId,
        stock_quantity: parseInt(stockQuantity),
        price: parseFloat(price),
        is_available: true,
      };
      
      if (discountPrice && discountPrice.trim() && parseFloat(discountPrice) > 0) {
        addRequestData.discount_price = parseFloat(discountPrice);
      }
      
      if (expiryDate && expiryDate.trim()) {
        addRequestData.expiry_date = expiryDate;
      }

      if (batchNumber && batchNumber.trim()) {
        addRequestData.batch_number = batchNumber;
      }
      
      const addResponse = await pharmacistInventoryService.addMedicineToInventory(addRequestData);

      if (addResponse.success) {
        Alert.alert('Success', 'Medicine created and added to inventory successfully!', [
          { text: 'OK', onPress: () => {
            onSuccess();
            onClose();
          }},
        ]);
      } else {
        Alert.alert('Error', addResponse.message || 'Failed to add medicine to inventory');
      }
    } catch (error: any) {
      console.error('Error creating medicine:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create medicine');
    } finally {
      setCreatingMedicine(false);
    }
  };

  const handleAddToInventory = async () => {
    if (!selectedMedicine) {
      Alert.alert('Error', 'Please select a medicine');
      return;
    }

    if (!stockQuantity || parseInt(stockQuantity) < 0) {
      Alert.alert('Error', 'Please enter a valid stock quantity');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setLoading(true);

      // Get facility ID first to verify it exists
      const facilityId = await pharmacistInventoryService.getPharmacistFacilityId();
      if (!facilityId) {
        Alert.alert(
          'Error', 
          'Unable to determine your pharmacy facility. Please make sure you are registered as a pharmacist with a facility assigned.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const data: AddMedicineToInventoryData = {
        medicine_id: parseInt(selectedMedicine.id),
        stock_quantity: parseInt(stockQuantity),
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : undefined,
        expiry_date: expiryDate || undefined,
        batch_number: batchNumber || undefined,
        is_available: true,
      };

      const response = await pharmacistInventoryService.addMedicineToInventory(data);

      if (response.success) {
        Alert.alert('Success', 'Medicine added to inventory successfully!', [
          { text: 'OK', onPress: () => {
            onSuccess();
            onClose();
          }},
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to add medicine to inventory');
      }
    } catch (error) {
      console.error('Error adding medicine to inventory:', error);
      Alert.alert('Error', 'Failed to add medicine to inventory. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.headerTitle}>Add Medicine to Inventory</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#1a1f3a" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Search Medicine */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Medicine</Text>
              <View style={styles.searchContainer}>
                <FontAwesome name="search" size={18} color="#95a5a6" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, generic name, or manufacturer..."
                  placeholderTextColor="#95a5a6"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searching && (
                  <ActivityIndicator size="small" color="#d4af37" />
                )}
              </View>

              {/* Help Text */}
              {!searchQuery.trim() && !selectedMedicine && (
                <View style={styles.helpTextContainer}>
                  <FontAwesome name="info-circle" size={20} color="#95a5a6" />
                  <Text style={styles.helpText}>
                    Start typing to search for medicines in the database
                  </Text>
                </View>
              )}

              {/* Search Results */}
              {searchQuery && !selectedMedicine && medicines.length > 0 && (
                <View style={styles.searchResults}>
                  <Text style={styles.searchResultsTitle}>Search Results ({medicines.length})</Text>
                  {medicines.map((medicine) => (
                    <TouchableOpacity
                      key={medicine.id}
                      style={styles.medicineOption}
                      onPress={() => handleSelectMedicine(medicine)}
                    >
                      <View style={styles.medicineOptionContent}>
                        <Text style={styles.medicineOptionName}>{medicine.name}</Text>
                        {medicine.generic_name && (
                          <Text style={styles.medicineOptionGeneric}>{medicine.generic_name}</Text>
                        )}
                        {medicine.manufacturer && (
                          <Text style={styles.medicineOptionManufacturer}>
                            {medicine.manufacturer}
                          </Text>
                        )}
                      </View>
                      <FontAwesome name="chevron-right" size={14} color="#bdc3c7" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* No Results Message */}
              {searchQuery.trim() && medicines.length === 0 && !searching && !selectedMedicine && !showCreateForm && (
                <View style={styles.noResultsContainer}>
                  <FontAwesome name="search" size={32} color="#bdc3c7" />
                  <Text style={styles.noResultsText}>No medicines found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try a different search term or create a new medicine
                  </Text>
                  <TouchableOpacity
                    style={styles.createNewButton}
                    onPress={() => {
                      setNewMedicineName(searchQuery);
                      setShowCreateForm(true);
                    }}
                  >
                    <FontAwesome name="plus-circle" size={16} color="#fff" />
                    <Text style={styles.createNewButtonText}>Create "{searchQuery}"</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Create New Medicine Form */}
              {showCreateForm && !selectedMedicine && (
                <View style={styles.createFormContainer}>
                  <View style={styles.createFormHeader}>
                    <Text style={styles.createFormTitle}>Create New Medicine</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowCreateForm(false);
                        setNewMedicineName('');
                      }}
                    >
                      <FontAwesome name="times" size={18} color="#7f8c8d" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formLabel}>Medicine Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter medicine name"
                    value={newMedicineName}
                    onChangeText={setNewMedicineName}
                  />

                  <Text style={styles.formLabel}>Generic Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter generic name (optional)"
                    value={newMedicineGenericName}
                    onChangeText={setNewMedicineGenericName}
                  />

                  <Text style={styles.formLabel}>Brand Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter brand name (optional)"
                    value={newMedicineBrandName}
                    onChangeText={setNewMedicineBrandName}
                  />

                  <Text style={styles.formLabel}>Medicine Image (Optional)</Text>
                  {newMedicineImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: newMedicineImage }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={removeMedicineImage}
                      >
                        <FontAwesome name="times-circle" size={24} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={pickMedicineImage}
                    >
                      <FontAwesome name="camera" size={20} color="#d4af37" />
                      <Text style={styles.imagePickerText}>Select Image</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.formLabel}>Category *</Text>
                  <View style={styles.pickerContainer}>
                    {['antibiotics', 'painkillers', 'vitamins', 'diabetes', 'heart', 'respiratory', 'other'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          newMedicineCategory === cat && styles.categoryChipActive
                        ]}
                        onPress={() => setNewMedicineCategory(cat)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          newMedicineCategory === cat && styles.categoryChipTextActive
                        ]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>Dosage Form *</Text>
                  <View style={styles.pickerContainer}>
                    {['tablet', 'capsule', 'liquid', 'injection', 'cream', 'inhaler', 'other'].map((form) => (
                      <TouchableOpacity
                        key={form}
                        style={[
                          styles.categoryChip,
                          newMedicineDosageForm === form && styles.categoryChipActive
                        ]}
                        onPress={() => setNewMedicineDosageForm(form)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          newMedicineDosageForm === form && styles.categoryChipTextActive
                        ]}>
                          {form.charAt(0).toUpperCase() + form.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>Strength</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., 500mg, 10ml (optional)"
                    value={newMedicineStrength}
                    onChangeText={setNewMedicineStrength}
                  />

                  <Text style={styles.formLabel}>Manufacturer</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter manufacturer (optional)"
                    value={newMedicineManufacturer}
                    onChangeText={setNewMedicineManufacturer}
                  />

                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Enter description (optional)"
                    value={newMedicineDescription}
                    onChangeText={setNewMedicineDescription}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.formLabel}>Active Ingredients</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Enter active ingredients (optional)"
                    value={newMedicineActiveIngredients}
                    onChangeText={setNewMedicineActiveIngredients}
                    multiline
                    numberOfLines={2}
                  />

                  <Text style={styles.formLabel}>Side Effects</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Enter side effects (optional)"
                    value={newMedicineSideEffects}
                    onChangeText={setNewMedicineSideEffects}
                    multiline
                    numberOfLines={2}
                  />

                  <Text style={styles.formLabel}>Contraindications</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Enter contraindications (optional)"
                    value={newMedicineContraindications}
                    onChangeText={setNewMedicineContraindications}
                    multiline
                    numberOfLines={2}
                  />

                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setNewMedicinePrescriptionRequired(!newMedicinePrescriptionRequired)}
                    >
                      <FontAwesome
                        name={newMedicinePrescriptionRequired ? "check-square" : "square-o"}
                        size={20}
                        color={newMedicinePrescriptionRequired ? "#d4af37" : "#7f8c8d"}
                      />
                      <Text style={styles.checkboxLabel}>Prescription Required</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formLabel}>Stock Quantity *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter stock quantity"
                    keyboardType="numeric"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                  />

                  <Text style={styles.formLabel}>Price (₵) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter price per unit"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />

                  <Text style={styles.formLabel}>Discount Price (₵) - Optional</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter discount price (optional)"
                    keyboardType="decimal-pad"
                    value={discountPrice}
                    onChangeText={setDiscountPrice}
                  />

                  <Text style={styles.formLabel}>Expiry Date - Optional</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      if (expiryDate) {
                        setTempExpiryDate(new Date(expiryDate));
                      } else {
                        const defaultDate = new Date();
                        defaultDate.setFullYear(defaultDate.getFullYear() + 1);
                        setTempExpiryDate(defaultDate);
                      }
                      setShowExpiryDatePicker(true);
                    }}
                  >
                    <FontAwesome name="calendar" size={16} color="#d4af37" />
                    <Text style={styles.datePickerText}>
                      {expiryDate || 'Select expiry date (optional)'}
                    </Text>
                    {expiryDate && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setExpiryDate('');
                          const date = new Date();
                          date.setFullYear(date.getFullYear() + 1);
                          setExpiryDateValue(date);
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        <FontAwesome name="times-circle" size={18} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.formLabel}>Batch Number (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter batch number (optional)"
                    value={batchNumber}
                    onChangeText={setBatchNumber}
                  />

                  <TouchableOpacity
                    style={[styles.addButton, creatingMedicine && styles.addButtonDisabled]}
                    onPress={handleCreateNewMedicine}
                    disabled={creatingMedicine}
                  >
                    {creatingMedicine ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <FontAwesome name="plus" size={16} color="#fff" />
                        <Text style={styles.addButtonText}>Create & Add to Inventory</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Selected Medicine */}
              {selectedMedicine && (
                <View style={styles.selectedMedicineCard}>
                  <Text style={styles.selectedMedicineTitle}>Selected Medicine</Text>
                  <View style={styles.selectedMedicineInfo}>
                    <Text style={styles.selectedMedicineName}>{selectedMedicine.name}</Text>
                    {selectedMedicine.generic_name && (
                      <Text style={styles.selectedMedicineGeneric}>
                        {selectedMedicine.generic_name}
                      </Text>
                    )}
                    <Text style={styles.selectedMedicineCategory}>
                      Category: {selectedMedicine.category}
                    </Text>
                    {selectedMedicine.dosage_form && (
                      <Text style={styles.selectedMedicineDetail}>
                        Form: {selectedMedicine.dosage_form}
                      </Text>
                    )}
                    {selectedMedicine.strength && (
                      <Text style={styles.selectedMedicineDetail}>
                        Strength: {selectedMedicine.strength}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.changeMedicineButton}
                    onPress={() => {
                      setSelectedMedicine(null);
                      setSearchQuery('');
                    }}
                  >
                    <Text style={styles.changeMedicineText}>Change Medicine</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Inventory Details */}
            {selectedMedicine && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inventory Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Stock Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter quantity"
                    placeholderTextColor="#95a5a6"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price (₵) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter price"
                    placeholderTextColor="#95a5a6"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Discount Price (₵) (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter discount price"
                    placeholderTextColor="#95a5a6"
                    value={discountPrice}
                    onChangeText={setDiscountPrice}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Expiry Date - Optional</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      if (expiryDate) {
                        setTempExpiryDate(new Date(expiryDate));
                      } else {
                        const defaultDate = new Date();
                        defaultDate.setFullYear(defaultDate.getFullYear() + 1);
                        setTempExpiryDate(defaultDate);
                      }
                      setShowExpiryDatePicker(true);
                    }}
                  >
                    <FontAwesome name="calendar" size={16} color="#d4af37" />
                    <Text style={styles.datePickerText}>
                      {expiryDate || 'Select expiry date (optional)'}
                    </Text>
                    {expiryDate && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setExpiryDate('');
                          const date = new Date();
                          date.setFullYear(date.getFullYear() + 1);
                          setExpiryDateValue(date);
                        }}
                        style={{ marginLeft: 8 }}
                      >
                        <FontAwesome name="times-circle" size={18} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Batch Number (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter batch number"
                    placeholderTextColor="#95a5a6"
                    value={batchNumber}
                    onChangeText={setBatchNumber}
                  />
                </View>
              </View>
            )}

            {/* Expiry Date Picker */}
            {showExpiryDatePicker && (
              Platform.OS === 'ios' ? (
                <Modal
                  visible={showExpiryDatePicker}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowExpiryDatePicker(false)}
                >
                  <View style={styles.datePickerModalOverlay}>
                    <View style={styles.datePickerModalContent}>
                      <View style={styles.datePickerModalHeader}>
                        <Text style={styles.datePickerModalTitle}>Select Expiry Date</Text>
                        <TouchableOpacity onPress={() => setShowExpiryDatePicker(false)}>
                          <FontAwesome name="times" size={20} color="#1a1f3a" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.datePickerLabelContainer}>
                        <Text style={styles.datePickerLabel}>
                          Selected: {tempExpiryDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Text>
                      </View>
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={tempExpiryDate}
                          mode="date"
                          display="spinner"
                          minimumDate={new Date()}
                          onChange={(event, date) => {
                            if (date && event.type !== 'dismissed') {
                              setTempExpiryDate(new Date(date));
                            }
                          }}
                          textColor="#000000"
                          accentColor="#d4af37"
                          style={styles.datePicker}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.datePickerDoneButton}
                        onPress={() => {
                          const dateString = tempExpiryDate.toISOString().split('T')[0];
                          setExpiryDate(dateString);
                          setExpiryDateValue(new Date(tempExpiryDate));
                          setShowExpiryDatePicker(false);
                        }}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={expiryDateValue}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    if (date && event.type !== 'dismissed') {
                      setExpiryDateValue(date);
                      const dateString = date.toISOString().split('T')[0];
                      setExpiryDate(dateString);
                    }
                    setShowExpiryDatePicker(false);
                  }}
                />
              )
            )}

            {/* Add Button for Selected Medicine */}
            {selectedMedicine && (
              <TouchableOpacity
                style={[styles.addButton, loading && styles.addButtonDisabled]}
                onPress={handleAddToInventory}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="plus" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Add to Inventory</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
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
    maxHeight: '95%',
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1f3a',
  },
  searchResults: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  medicineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  medicineOptionContent: {
    flex: 1,
  },
  medicineOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1f3a',
    marginBottom: 4,
  },
  medicineOptionGeneric: {
    fontSize: 13,
    color: '#7a7a7a',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  medicineOptionManufacturer: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  selectedMedicineCard: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  selectedMedicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedMedicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1f3a',
    flex: 1,
  },
  selectedMedicineGeneric: {
    fontSize: 14,
    color: '#7a7a7a',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  selectedMedicineCategory: {
    fontSize: 12,
    color: '#5a4fcf',
    backgroundColor: '#5a4fcf20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1f3a',
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
  addButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#d4af37',
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#7a7a7a',
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 12,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7a7a7a',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createNewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createFormContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  createFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1f3a',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d4af37',
    borderStyle: 'dashed',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#d4af37',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
  },
  checkboxContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1a1f3a',
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1f3a',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
  },
  datePickerLabelContainer: {
    padding: 16,
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#1a1f3a',
    fontWeight: '600',
  },
  datePickerContainer: {
    padding: 20,
  },
  datePicker: {
    width: '100%',
  },
  datePickerDoneButton: {
    backgroundColor: '#d4af37',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedMedicineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 12,
  },
  selectedMedicineInfo: {
    marginBottom: 12,
  },
  selectedMedicineDetail: {
    fontSize: 13,
    color: '#7a7a7a',
    marginTop: 4,
  },
  changeMedicineButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
  },
  changeMedicineText: {
    fontSize: 14,
    color: '#7a7a7a',
    fontWeight: '500',
  },
});

