
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { facilitiesService } from '../services/facilitiesService';
import { professionalsService } from '../services/professionalsService';
import { medicinesService, Medicine as MedicineType } from '../services/medicinesService';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '../constants/API';

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  isVerified: boolean;
}

interface Medicine {
  id: number;
  name: string;
  generic_name?: string;
  genericName?: string; // Support both formats
  category: string;
  stock_quantity?: number;
  stockQuantity?: number; // Support both formats
  price: number;
  discount_price?: number;
  discountPrice?: number; // Support both formats
  is_available?: boolean;
  isAvailable?: boolean; // Support both formats
}

export default function FacilityManagementScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const facilityId = params.id as string;
  const facilityType = params.type as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'medicines' | 'orders' | 'settings'>('overview');
  const [facility, setFacility] = useState<any>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);

  useEffect(() => {
    loadFacilityData();
  }, [facilityId]);

  const loadFacilityData = async () => {
    try {
      setLoading(true);
      
      // Load facility details
      const facilityResponse = await facilitiesService.getFacilityById(facilityId);
      if (facilityResponse.success && facilityResponse.data) {
        setFacility(facilityResponse.data);
      }

      // Load staff (if facility type supports it)
      if (facilityType === 'pharmacy' || facilityType === 'hospital') {
        const staffResponse = await professionalsService.getProfessionalsByFacility(facilityId);
        if (staffResponse.success && staffResponse.data) {
          const professionals = staffResponse.data.professionals || [];
          // Transform HealthcareProfessional to StaffMember
          const transformedStaff: StaffMember[] = professionals.map((prof: any) => ({
            id: prof.id,
            firstName: prof.first_name || prof.firstName || '',
            lastName: prof.last_name || prof.lastName || '',
            email: prof.email || '',
            phone: prof.phone || '',
            specialty: prof.specialty || prof.specialization || '',
            licenseNumber: prof.license_number || prof.licenseNumber || '',
            isVerified: prof.is_verified || prof.isVerified || false,
          }));
          setStaff(transformedStaff);
        }
      }

      // Load medicines (for pharmacies)
      if (facilityType === 'pharmacy') {
        const medicinesResponse = await facilitiesService.getFacilityMedicines(facilityId);
        if (medicinesResponse.success && medicinesResponse.data) {
          // The API returns medicines grouped by category, so we need to flatten them
          let medicinesArray: Medicine[] = [];
          
          if (medicinesResponse.data.medicines_by_category) {
            // Flatten medicines from all categories into a single array
            Object.values(medicinesResponse.data.medicines_by_category).forEach((categoryMedicines: any) => {
              if (Array.isArray(categoryMedicines)) {
                medicinesArray = medicinesArray.concat(categoryMedicines);
              }
            });
          } else if (Array.isArray(medicinesResponse.data)) {
            // If it's already an array, use it directly
            medicinesArray = medicinesResponse.data;
          } else if (medicinesResponse.data.medicines && Array.isArray(medicinesResponse.data.medicines)) {
            // If there's a medicines property that's an array
            medicinesArray = medicinesResponse.data.medicines;
          }
          
          // Normalize property names to support both snake_case and camelCase
          const normalizedMedicines = medicinesArray.map((med: any) => ({
            ...med,
            genericName: med.generic_name || med.genericName,
            stockQuantity: med.stock_quantity !== undefined ? med.stock_quantity : med.stockQuantity,
            discountPrice: med.discount_price !== undefined ? med.discount_price : med.discountPrice,
            isAvailable: med.is_available !== undefined ? med.is_available : med.isAvailable,
          }));
          
          setMedicines(normalizedMedicines);
        }
      }
    } catch (error: any) {
      console.error('Error loading facility data:', error);
      Alert.alert('Error', 'Failed to load facility data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFacilityData();
    setRefreshing(false);
  };

  const handleAddStaff = () => {
    Alert.alert(
      'Add Staff',
      'What type of staff member would you like to add?',
      [
        { text: 'Pharmacist', onPress: () => router.push('/pharmacist-registration') },
        { text: 'Doctor', onPress: () => router.push('/doctor-registration') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddMedicine = () => {
    setShowAddMedicineModal(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9b59b6" />
        <Text style={styles.loadingText}>Loading facility...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#9b59b6', '#8e44ad']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{facility?.name || 'Facility'}</Text>
          <Text style={styles.headerSubtitle}>
            {facilityType?.charAt(0).toUpperCase() + facilityType?.slice(1) || 'Facility'}
          </Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'overview', label: 'Overview', icon: 'home' },
            { key: 'staff', label: 'Staff', icon: 'users' },
            { key: 'medicines', label: 'Medicines', icon: 'medkit' },
            { key: 'orders', label: 'Orders', icon: 'list' },
            { key: 'settings', label: 'Settings', icon: 'cog' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <FontAwesome
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? '#9b59b6' : '#7f8c8d'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.activeTabLabel
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && (
          <OverviewTab 
            facility={facility} 
            facilityType={facilityType}
            staff={staff}
            medicines={medicines}
          />
        )}
        {activeTab === 'staff' && (
          <StaffTab
            staff={staff}
            facilityType={facilityType}
            onAddStaff={handleAddStaff}
            onRefresh={loadFacilityData}
          />
        )}
        {activeTab === 'medicines' && (
          <MedicinesTab
            medicines={medicines}
            facilityType={facilityType}
            onAddMedicine={handleAddMedicine}
            onRefresh={loadFacilityData}
            facilityId={facilityId}
            facilityName={facility?.name || ''}
          />
        )}
        {activeTab === 'orders' && <OrdersTab facilityId={facilityId} />}
        {activeTab === 'settings' && <SettingsTab facility={facility} />}
      </ScrollView>

      {/* Add Medicine Modal */}
      <AddMedicineModal
        visible={showAddMedicineModal}
        facilityId={facilityId}
        onClose={() => setShowAddMedicineModal(false)}
        onSuccess={() => {
          setShowAddMedicineModal(false);
          loadFacilityData();
        }}
      />
    </View>
  );
}

// Add Medicine Modal Component
function AddMedicineModal({
  visible,
  facilityId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState<MedicineType[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineType | null>(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [expiryDateValue, setExpiryDateValue] = useState<Date>(() => {
    // Set initial date to 1 year from now
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  });
  const [tempExpiryDate, setTempExpiryDate] = useState<Date>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  });
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

  const handleSelectMedicine = (medicine: MedicineType) => {
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
      
      const addResponse = await apiClient.post(`/facilities/${facilityId}/medicines`, addRequestData);

      if (addResponse.success) {
        Alert.alert('Success', 'Medicine created and added to pharmacy successfully');
        onSuccess();
      } else {
        Alert.alert('Error', addResponse.message || 'Failed to add medicine to pharmacy');
      }
    } catch (error: any) {
      console.error('Error creating medicine:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create medicine');
    } finally {
      setCreatingMedicine(false);
    }
  };

  const handleAddMedicine = async () => {
    if (!selectedMedicine) {
      Alert.alert('Error', 'Please select a medicine');
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
      setLoading(true);
      
      // Ensure medicine_id is an integer
      const medicineId = typeof selectedMedicine.id === 'string' 
        ? parseInt(selectedMedicine.id, 10) 
        : selectedMedicine.id;
      
      // Prepare request data
      const requestData: any = {
        medicine_id: medicineId,
        stock_quantity: parseInt(stockQuantity, 10),
        price: parseFloat(price),
        is_available: true,
      };
      
      // Only include discount_price if it has a value
      if (discountPrice && discountPrice.trim() && parseFloat(discountPrice) > 0) {
        requestData.discount_price = parseFloat(discountPrice);
      }
      
      // Include expiry_date if provided
      if (expiryDate && expiryDate.trim()) {
        requestData.expiry_date = expiryDate;
      }
      
      const response = await apiClient.post(`/facilities/${facilityId}/medicines`, requestData);

      if (response.success) {
        Alert.alert('Success', 'Medicine added to pharmacy successfully');
        onSuccess();
      } else {
        Alert.alert('Error', response.message || 'Failed to add medicine');
      }
    } catch (error: any) {
      console.error('Error adding medicine:', error);
      Alert.alert('Error', error.message || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Medicine</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* Search Medicine */}
            <View style={styles.searchContainer}>
              <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for medicine..."
                placeholderTextColor="#95a5a6"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.trim()) {
                    searchMedicines();
                  } else {
                    setMedicines([]);
                    setSelectedMedicine(null);
                  }
                }}
                autoFocus={true}
              />
              {searching && <ActivityIndicator size="small" color="#9b59b6" style={{ marginLeft: 8 }} />}
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

            {/* Medicine Search Results */}
            {medicines.length > 0 && !selectedMedicine && (
              <View style={styles.searchResults}>
                <Text style={styles.searchResultsTitle}>Search Results ({medicines.length})</Text>
                {medicines.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.medicineOption}
                    onPress={() => handleSelectMedicine(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.medicineOptionContent}>
                      <Text style={styles.medicineOptionName}>{item.name}</Text>
                      {item.generic_name && (
                        <Text style={styles.medicineOptionGeneric}>{item.generic_name}</Text>
                      )}
                      <Text style={styles.medicineOptionCategory}>{item.category}</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color="#95a5a6" />
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
                    <FontAwesome name="camera" size={20} color="#9b59b6" />
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
                      color={newMedicinePrescriptionRequired ? "#9b59b6" : "#7f8c8d"}
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

                <Text style={styles.formLabel}>Price (GHS) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter price per unit"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />

                <Text style={styles.formLabel}>Discount Price (GHS) - Optional</Text>
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
                    // Initialize temp date with current expiry date or default to 1 year from now
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
                  <FontAwesome name="calendar" size={16} color="#9b59b6" />
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
                      <Text style={styles.addButtonText}>Create & Add to Pharmacy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Medicine Info */}
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

            {/* Stock and Price Inputs */}
            {selectedMedicine && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Stock Quantity *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter stock quantity"
                  keyboardType="numeric"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                />

                <Text style={styles.formLabel}>Price (GHS) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter price per unit"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />

                <Text style={styles.formLabel}>Discount Price (GHS) - Optional</Text>
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
                    // Initialize temp date with current expiry date or default to 1 year from now
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
                  <FontAwesome name="calendar" size={16} color="#9b59b6" />
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
                          <FontAwesome name="times" size={20} color="#2c3e50" />
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
                            // Only update temp date while user is selecting - don't close picker
                            if (date && event.type !== 'dismissed') {
                              setTempExpiryDate(new Date(date)); // Create new Date object to ensure it's maintained
                            }
                          }}
                          textColor="#000000"
                          accentColor="#9b59b6"
                          style={styles.datePicker}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.datePickerDoneButton}
                        onPress={() => {
                          // Save the selected date when Done is pressed
                          const dateString = tempExpiryDate.toISOString().split('T')[0];
                          setExpiryDate(dateString);
                          setExpiryDateValue(new Date(tempExpiryDate)); // Create new Date object
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

            {/* Add Button */}
            {selectedMedicine && (
              <TouchableOpacity
                style={[styles.addButton, loading && styles.addButtonDisabled]}
                onPress={handleAddMedicine}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="plus" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Add to Pharmacy</Text>
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

// Overview Tab Component
function OverviewTab({ 
  facility, 
  facilityType,
  staff,
  medicines 
}: { 
  facility: any;
  facilityType: string;
  staff: StaffMember[];
  medicines: Medicine[];
}) {
  // Format full address
  const getFullAddress = () => {
    if (!facility) return 'N/A';
    const parts = [];
    if (facility.address) {
      if (typeof facility.address === 'string') {
        return facility.address;
      }
      if (facility.address.street) parts.push(facility.address.street);
    }
    if (facility.city) parts.push(facility.city);
    if (facility.state) parts.push(facility.state);
    if (facility.country) parts.push(facility.country);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Format operating hours
  const getOperatingHours = () => {
    if (!facility?.operating_hours) return 'N/A';
    if (typeof facility.operating_hours === 'string') {
      try {
        const hours = JSON.parse(facility.operating_hours);
        if (typeof hours === 'object') {
          return Object.entries(hours)
            .map(([day, time]) => `${day}: ${time}`)
            .join('\n');
        }
      } catch {
        return facility.operating_hours;
      }
    }
    return facility.operating_hours;
  };

  // Format services
  const getServices = () => {
    if (!facility?.services) return [];
    if (Array.isArray(facility.services)) return facility.services;
    if (typeof facility.services === 'string') {
      try {
        return JSON.parse(facility.services);
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <View style={styles.tabContent}>
      {/* Facility Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Facility Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <FontAwesome name="building" size={16} color="#9b59b6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Facility Type</Text>
              <Text style={styles.infoText}>
                {facilityType ? facilityType.charAt(0).toUpperCase() + facilityType.slice(1) : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="map-marker" size={16} color="#9b59b6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoText}>{getFullAddress()}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="phone" size={16} color="#9b59b6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoText}>{facility?.phone || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome name="envelope" size={16} color="#9b59b6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoText}>{facility?.email || 'N/A'}</Text>
            </View>
          </View>

          {facility?.website && (
            <View style={styles.infoRow}>
              <FontAwesome name="globe" size={16} color="#9b59b6" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Website</Text>
                <Text style={styles.infoText}>{facility.website}</Text>
              </View>
            </View>
          )}

          {facility?.operating_hours && (
            <View style={styles.infoRow}>
              <FontAwesome name="clock-o" size={16} color="#9b59b6" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Operating Hours</Text>
                <Text style={styles.infoText}>{getOperatingHours()}</Text>
              </View>
            </View>
          )}

          {facility?.rating && (
            <View style={styles.infoRow}>
              <FontAwesome name="star" size={16} color="#f39c12" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Rating</Text>
                <Text style={styles.infoText}>
                  {facility.rating.toFixed(1)} ⭐ ({facility.total_reviews || 0} reviews)
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <FontAwesome 
              name={facility?.is_verified ? "check-circle" : "times-circle"} 
              size={16} 
              color={facility?.is_verified ? "#27ae60" : "#e74c3c"} 
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Verification Status</Text>
              <Text style={[
                styles.infoText,
                { color: facility?.is_verified ? "#27ae60" : "#e74c3c" }
              ]}>
                {facility?.is_verified ? 'Verified' : 'Not Verified'}
              </Text>
            </View>
          </View>

          {facility?.created_at && (
            <View style={styles.infoRow}>
              <FontAwesome name="calendar" size={16} color="#9b59b6" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Registered</Text>
                <Text style={styles.infoText}>
                  {new Date(facility.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      {facility?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.infoCard}>
            <Text style={styles.descriptionText}>{facility.description}</Text>
          </View>
        </View>
      )}

      {/* Services */}
      {getServices().length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <View style={styles.infoCard}>
            <View style={styles.servicesContainer}>
              {getServices().map((service: string, index: number) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <FontAwesome name="users" size={24} color="#3498db" />
            <Text style={styles.statValue}>{staff.length}</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
          {facilityType === 'pharmacy' && (
            <View style={styles.statCard}>
              <FontAwesome name="medkit" size={24} color="#e74c3c" />
              <Text style={styles.statValue}>{medicines.length}</Text>
              <Text style={styles.statLabel}>Medicines</Text>
            </View>
          )}
          <View style={styles.statCard}>
            <FontAwesome name="shopping-cart" size={24} color="#f39c12" />
            <Text style={styles.statValue}>-</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          {facility?.rating && (
            <View style={styles.statCard}>
              <FontAwesome name="star" size={24} color="#f39c12" />
              <Text style={styles.statValue}>{facility.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          )}
        </View>
      </View>

      {/* Location Info */}
      {(facility?.latitude && facility?.longitude) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <FontAwesome name="map" size={16} color="#9b59b6" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Coordinates</Text>
                <Text style={styles.infoText}>
                  {facility.latitude.toFixed(6)}, {facility.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Staff Tab Component
function StaffTab({
  staff,
  facilityType,
  onAddStaff,
  onRefresh,
}: {
  staff: StaffMember[];
  facilityType: string;
  onAddStaff: () => void;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff Members</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddStaff}>
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {staff.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="users" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>No staff members yet</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAddStaff}>
            <Text style={styles.emptyButtonText}>Add First Staff Member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {staff.map((member) => (
            <View key={member.id} style={styles.staffCard}>
              <View style={styles.staffInfo}>
                <View style={styles.staffAvatar}>
                  <FontAwesome name="user-md" size={20} color="#9b59b6" />
                </View>
                <View style={styles.staffDetails}>
                  <Text style={styles.staffName}>
                    {member.firstName} {member.lastName}
                  </Text>
                  <Text style={styles.staffRole}>{member.specialty}</Text>
                  <Text style={styles.staffEmail}>{member.email}</Text>
                </View>
              </View>
              <View style={styles.staffActions}>
                {member.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <FontAwesome name="check-circle" size={14} color="#27ae60" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Medicines Tab Component
function MedicinesTab({
  medicines,
  facilityType,
  onAddMedicine,
  onRefresh,
  facilityId,
  facilityName,
}: {
  medicines: Medicine[];
  facilityType: string;
  onAddMedicine: () => void;
  onRefresh: () => void;
  facilityId?: string;
  facilityName?: string;
}) {
  const router = useRouter();
  if (facilityType !== 'pharmacy') {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyState}>
          <FontAwesome name="info-circle" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>
            Medicine management is only available for pharmacies
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Medicines Inventory</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddMedicine}>
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add Medicine</Text>
        </TouchableOpacity>
      </View>

      {medicines.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="medkit" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>No medicines in inventory</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAddMedicine}>
            <Text style={styles.emptyButtonText}>Add First Medicine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {medicines.map((medicine) => (
            <TouchableOpacity
              key={medicine.id}
              style={styles.medicineCard}
              onPress={() => {
                const med = medicine as any; // Type assertion to access all possible fields
                router.push({
                  pathname: '/medicine-details-modal',
                  params: {
                    medicineId: medicine.id.toString(),
                    medicineName: medicine.name,
                    genericName: medicine.genericName || med.generic_name || '',
                    category: medicine.category || '',
                    prescriptionRequired: (med.prescriptionRequired || med.prescription_required) ? 'true' : 'false',
                    dosageForm: med.dosageForm || med.dosage_form || '',
                    strength: med.strength || '',
                    description: med.description || '',
                    manufacturer: med.manufacturer || '',
                    // Facility-specific data
                    facilityId: facilityId || '',
                    facilityName: facilityName || '',
                    stockQuantity: (medicine.stockQuantity !== undefined ? medicine.stockQuantity : (med.stock_quantity || 0)).toString(),
                    price: (medicine.price || 0).toString(),
                    discountPrice: (medicine.discountPrice || med.discount_price || 0).toString(),
                    isAvailable: (medicine.isAvailable !== undefined ? medicine.isAvailable : (med.is_available !== undefined ? med.is_available : true)) ? 'true' : 'false',
                    medicineImage: med.image || '',
                    // Flag to indicate this is from facility management
                    fromFacility: 'true',
                  }
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.medicineCardContent}>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  {(medicine.genericName || medicine.generic_name) && (
                    <Text style={styles.medicineGeneric}>
                      {medicine.genericName || medicine.generic_name}
                    </Text>
                  )}
                  <Text style={styles.medicineCategory}>{medicine.category}</Text>
                </View>
                <View style={styles.medicineDetails}>
                <View style={styles.medicineDetailRow}>
                  <Text style={styles.medicineLabel}>Stock:</Text>
                  <Text style={styles.medicineValue}>
                    {medicine.stockQuantity !== undefined ? medicine.stockQuantity : (medicine.stock_quantity || 0)}
                  </Text>
                </View>
                <View style={styles.medicineDetailRow}>
                  <Text style={styles.medicineLabel}>Price:</Text>
                  <Text style={styles.medicineValue}>₵{medicine.price?.toFixed(2) || '0.00'}</Text>
                </View>
                {(medicine.discountPrice || medicine.discount_price) && (
                  <View style={styles.medicineDetailRow}>
                    <Text style={styles.medicineLabel}>Discount:</Text>
                    <Text style={[styles.medicineValue, styles.discountPrice]}>
                      ₵{(medicine.discountPrice || medicine.discount_price)?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                )}
                <View style={styles.medicineStatus}>
                  {(medicine.isAvailable !== undefined ? medicine.isAvailable : (medicine.is_available !== undefined ? medicine.is_available : true)) ? (
                    <View style={styles.availableBadge}>
                      <FontAwesome name="check-circle" size={12} color="#27ae60" />
                      <Text style={styles.availableText}>Available</Text>
                    </View>
                  ) : (
                    <View style={styles.unavailableBadge}>
                      <FontAwesome name="times-circle" size={12} color="#e74c3c" />
                      <Text style={styles.unavailableText}>Out of Stock</Text>
                    </View>
                  )}
                </View>
              </View>
              </View>
              <View style={styles.medicineCardArrow}>
                <FontAwesome name="chevron-right" size={16} color="#95a5a6" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Orders Tab Component
function OrdersTab({ facilityId }: { facilityId: string }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.emptyState}>
        <FontAwesome name="list" size={48} color="#bdc3c7" />
        <Text style={styles.emptyText}>Orders management coming soon</Text>
      </View>
    </View>
  );
}

// Settings Tab Component
function SettingsTab({ facility }: { facility: any }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Facility Settings</Text>
        <View style={styles.emptyState}>
          <FontAwesome name="cog" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>Settings coming soon</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#9b59b6',
  },
  tabLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#9b59b6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    backgroundColor: '#f1f2f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.9,
    maxHeight: Dimensions.get('window').height * 0.95,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  searchResults: {
    marginBottom: 16,
    maxHeight: 400,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  medicineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  medicineOptionContent: {
    flex: 1,
  },
  medicineOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  medicineOptionGeneric: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  medicineOptionCategory: {
    fontSize: 12,
    color: '#95a5a6',
  },
  selectedMedicineCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectedMedicineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  selectedMedicineInfo: {
    marginBottom: 12,
  },
  selectedMedicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  selectedMedicineGeneric: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  selectedMedicineCategory: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 2,
  },
  selectedMedicineDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  changeMedicineButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  changeMedicineText: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 16,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9b59b6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  createNewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createFormContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
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
    color: '#2c3e50',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryChipActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  checkboxContainer: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#9b59b6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  imagePickerText: {
    color: '#9b59b6',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
  },
  staffCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  staffRole: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  staffEmail: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  staffActions: {
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d5f4e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineCardContent: {
    flex: 1,
  },
  medicineInfo: {
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  medicineGeneric: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  medicineCategory: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  medicineDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  medicineDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  medicineLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  medicineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  discountPrice: {
    color: '#e74c3c',
    textDecorationLine: 'line-through',
  },
  medicineStatus: {
    marginTop: 8,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d5f4e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  availableText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadbd8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  unavailableText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  medicineCardArrow: {
    marginLeft: 12,
    padding: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    maxHeight: '80%',
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  datePickerLabelContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    minHeight: 200,
    backgroundColor: '#fff',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  datePickerDoneButton: {
    backgroundColor: '#9b59b6',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

