
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
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '../constants/API';

interface StaffMember {
  id: number;
  userId?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  isVerified: boolean;
  profileImage?: string;
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
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showStaffManagementModal, setShowStaffManagementModal] = useState(false);

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
        console.log('🔍 Loading staff for facility:', facilityId);
        // Pass includeAll=true to get all staff regardless of verification/availability status
        const staffResponse = await professionalsService.getProfessionalsByFacility(facilityId, 100, true);
        console.log('🔍 Staff response:', staffResponse);
        if (staffResponse.success && staffResponse.data) {
          const professionals = staffResponse.data.professionals || [];
          console.log('🔍 Professionals found:', professionals.length);
          // Helper function to convert profile image path to full URL
          const getProfileImageUrl = (imagePath: string | null | undefined): string | undefined => {
            if (!imagePath || imagePath === 'null' || imagePath === '') {
              return undefined;
            }
            // If it's already a full URL, return as is
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
              return imagePath;
            }
            // Convert relative path to full URL
            if (imagePath.startsWith('/uploads/')) {
              const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
              return `${baseUrl}${imagePath}`;
            }
            return imagePath;
          };
          
          // Transform HealthcareProfessional to StaffMember
          const transformedStaff: StaffMember[] = professionals.map((prof: any) => ({
            id: prof.id,
            userId: prof.user_id || prof.userId || null,
            firstName: prof.first_name || prof.firstName || '',
            lastName: prof.last_name || prof.lastName || '',
            email: prof.email || '',
            phone: prof.phone || '',
            specialty: prof.specialty || prof.specialization || '',
            licenseNumber: prof.license_number || prof.licenseNumber || '',
            isVerified: prof.is_verified || prof.isVerified || false,
            profileImage: getProfileImageUrl(prof.profile_image || prof.profileImage),
          }));
          console.log('🔍 Transformed staff:', transformedStaff.length);
          setStaff(transformedStaff);
        } else {
          console.log('⚠️ Failed to load staff:', staffResponse.message);
          setStaff([]);
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
    console.log('🔍 Facility Management - handleAddStaff called');
    console.log('🔍 Facility Management - facilityId:', facilityId);
    console.log('🔍 Facility Management - facilityId type:', typeof facilityId);
    
    if (!facilityId) {
      Alert.alert('Error', 'Facility ID is missing. Cannot add staff.');
      return;
    }
    
    Alert.alert(
      'Add Staff',
      'What type of staff member would you like to add?',
      [
        { 
          text: 'Pharmacist', 
          onPress: () => {
            console.log('🔍 Navigating to pharmacist registration with facilityId:', facilityId);
            router.push(`/pharmacist-registration?facilityId=${facilityId}`);
          }
        },
        { 
          text: 'Doctor', 
          onPress: () => {
            console.log('🔍 Navigating to doctor registration with facilityId:', facilityId);
            router.push(`/doctor-registration?facilityId=${facilityId}`);
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddMedicine = () => {
    setShowAddMedicineModal(true);
  };

  const handleChatWithStaff = async (member: StaffMember) => {
    try {
      if (!member.userId) {
        Alert.alert('Error', 'Unable to start chat. Staff member user ID is missing.');
        return;
      }

      if (!user?.id) {
        Alert.alert('Error', 'Unable to start chat. Please log in again.');
        return;
      }

      const staffName = `${member.firstName} ${member.lastName}`;
      const staffEmail = member.email;
      const staffAvatar = member.profileImage || '';

      // Check if conversation already exists
      try {
        const conversationsResponse = await chatService.getConversations();
        if (conversationsResponse.success && conversationsResponse.data) {
          const existingConversation = conversationsResponse.data.find((conv: any) => 
            conv.professional_id === member.userId
          );
          
          if (existingConversation) {
            // Navigate to existing conversation
            router.push({
              pathname: '/chat-screen',
              params: {
                conversationId: existingConversation.id.toString(),
                patientName: staffName,
                patientEmail: staffEmail,
                patientAvatar: staffAvatar,
              },
            });
            return;
          }
        }
      } catch (err) {
        console.log('Could not check existing conversations, will create new one');
      }

      // Create new conversation
      const conversationResponse = await chatService.createConversation({
        professional_id: member.id, // Backend will look up user_id from healthcare_professionals
        subject: `Chat with ${staffName}`,
        initial_message: 'Hello.'
      });

      if (conversationResponse.success && conversationResponse.data) {
        const conversationId = (conversationResponse.data as any).id || 
                              (conversationResponse.data as any).conversationId ||
                              (conversationResponse.data as any).conversation_id;
        
        if (conversationId) {
          router.push({
            pathname: '/chat-screen',
            params: {
              conversationId: conversationId.toString(),
              patientName: staffName,
              patientEmail: staffEmail,
              patientAvatar: staffAvatar,
            },
          });
        } else {
          Alert.alert('Error', 'Failed to get conversation ID. Please try again.');
        }
      } else {
        const errorMessage = conversationResponse.message || 'Failed to start conversation';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error starting chat with staff:', error);
      Alert.alert('Error', error.message || 'Failed to start chat. Please try again.');
    }
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
            onStaffClick={(member) => {
              setSelectedStaff(member);
              setShowStaffManagementModal(true);
            }}
            onChatWithStaff={handleChatWithStaff}
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
        {activeTab === 'settings' && <SettingsTab facility={facility} onUpdate={loadFacilityData} />}
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

      {/* Staff Management Modal */}
      {selectedStaff && (
        <StaffManagementModal
          visible={showStaffManagementModal}
          staff={selectedStaff}
          onClose={() => {
            setShowStaffManagementModal(false);
            setSelectedStaff(null);
          }}
          onUpdate={async () => {
            // Reload facility data to get updated staff information
            await loadFacilityData();
            // Update selectedStaff with the latest data from the reloaded staff list
            if (selectedStaff) {
              const updatedStaffFromList = staff.find(s => s.id === selectedStaff.id);
              if (updatedStaffFromList) {
                setSelectedStaff(updatedStaffFromList);
              }
            }
          }}
          onDelete={() => {
            setShowStaffManagementModal(false);
            setSelectedStaff(null);
            loadFacilityData();
          }}
        />
      )}
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
    // Handle both operating_hours (snake_case) and operatingHours (camelCase)
    const hoursData = facility?.operating_hours || facility?.operatingHours;
    if (!hoursData) return 'N/A';
    
    let hours;
    if (typeof hoursData === 'string') {
      try {
        hours = JSON.parse(hoursData);
      } catch {
        return hoursData;
      }
    } else {
      hours = hoursData;
    }
    
    if (typeof hours !== 'object' || hours === null) {
      return 'N/A';
    }
    
    const dayNames: { [key: string]: string } = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    
    return Object.entries(hours)
      .map(([day, time]: [string, any]) => {
        const dayName = dayNames[day] || day.charAt(0).toUpperCase() + day.slice(1);
        if (time && typeof time === 'object') {
          if (time.isOpen === false || time.isOpen === 0) {
            return `${dayName}: Closed`;
          }
          return `${dayName}: ${time.open || 'N/A'} - ${time.close || 'N/A'}`;
        }
        return `${dayName}: ${time}`;
      })
      .join('\n');
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.infoText}>
                    {facility.rating.toFixed(1)}
                  </Text>
                  <FontAwesome name="star" size={12} color="#f39c12" style={{ marginHorizontal: 4 }} />
                  <Text style={styles.infoText}>
                    ({facility.total_reviews || 0} reviews)
                  </Text>
                </View>
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
                  {facility.latitude && !isNaN(parseFloat(facility.latitude)) 
                    ? parseFloat(facility.latitude).toFixed(6) 
                    : 'N/A'}, {facility.longitude && !isNaN(parseFloat(facility.longitude)) 
                    ? parseFloat(facility.longitude).toFixed(6) 
                    : 'N/A'}
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
  onStaffClick,
  onChatWithStaff,
}: {
  staff: StaffMember[];
  facilityType: string;
  onAddStaff: () => void;
  onRefresh: () => void;
  onStaffClick: (member: StaffMember) => void;
  onChatWithStaff: (member: StaffMember) => void;
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
            <TouchableOpacity 
              key={member.id} 
              style={styles.staffCard}
              onPress={() => onStaffClick(member)}
              activeOpacity={0.7}
            >
              <View style={styles.staffInfo}>
                {member.profileImage ? (
                  <Image
                    source={{ uri: member.profileImage }}
                    style={styles.staffAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.staffAvatar}>
                    <FontAwesome name="user-md" size={20} color="#9b59b6" />
                  </View>
                )}
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
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onChatWithStaff(member);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FontAwesome name="comment" size={18} color="#3498db" />
                </TouchableOpacity>
                <FontAwesome name="chevron-right" size={16} color="#bdc3c7" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
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
function SettingsTab({ facility, onUpdate }: { facility: any; onUpdate: () => void }) {
  // Helper function to convert database boolean values to JavaScript boolean
  const toBoolean = (value: any): boolean => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return false;
    }
    
    // Handle boolean values
    if (value === true || value === false) {
      return value;
    }
    
    // Handle numeric values (MySQL returns TINYINT(1) as 0 or 1)
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === '1' || lowerValue === 'true' || lowerValue === 'yes') {
        return true;
      }
      if (lowerValue === '0' || lowerValue === 'false' || lowerValue === 'no' || lowerValue === '') {
        return false;
      }
    }
    
    // For any other truthy value, return true
    return Boolean(value);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    // Use original fields if available, otherwise check transformed structure
    let addressValue = '';
    if (facility?.address_original) {
      addressValue = facility.address_original;
    } else if (facility?.address) {
      if (typeof facility.address === 'string') {
        addressValue = facility.address;
      } else if (facility.address.street) {
        addressValue = facility.address.street;
      }
    }
    
    return {
      name: facility?.name || '',
      address: addressValue,
      city: facility?.city || facility?.address?.city || '',
      state: facility?.state || facility?.address?.state || '',
      postal_code: facility?.postal_code || facility?.address?.zipCode || '',
      phone: facility?.phone || '',
      email: facility?.email || '',
      website: facility?.website || '',
      description: facility?.description || '',
      emergency_contact: (facility?.emergency_contact !== null && facility?.emergency_contact !== undefined) ? facility.emergency_contact : '',
      accepts_insurance: toBoolean(facility?.accepts_insurance),
      has_delivery: toBoolean(facility?.has_delivery),
      has_consultation: toBoolean(facility?.has_consultation),
      is_active: toBoolean(facility?.is_active),
    };
  });

  const [operatingHours, setOperatingHours] = useState(() => {
    // Handle both operating_hours (snake_case) and operatingHours (camelCase)
    const hoursData = facility?.operating_hours || facility?.operatingHours;
    if (hoursData) {
      const hours = typeof hoursData === 'string' 
        ? JSON.parse(hoursData) 
        : hoursData;
      return {
        monday: hours.monday || { open: '08:00', close: '18:00', isOpen: true },
        tuesday: hours.tuesday || { open: '08:00', close: '18:00', isOpen: true },
        wednesday: hours.wednesday || { open: '08:00', close: '18:00', isOpen: true },
        thursday: hours.thursday || { open: '08:00', close: '18:00', isOpen: true },
        friday: hours.friday || { open: '08:00', close: '18:00', isOpen: true },
        saturday: hours.saturday || { open: '09:00', close: '17:00', isOpen: true },
        sunday: hours.sunday || { open: '09:00', close: '17:00', isOpen: true },
      };
    }
    return {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '17:00', isOpen: true },
      sunday: { open: '09:00', close: '17:00', isOpen: true },
    };
  });

  const [services, setServices] = useState<string[]>(() => {
    if (facility?.services) {
      return typeof facility.services === 'string' 
        ? JSON.parse(facility.services) 
        : facility.services;
    }
    return [];
  });
  const [newService, setNewService] = useState('');
  const [selectedImages, setSelectedImages] = useState<any[]>([]);

  useEffect(() => {
    if (facility) {
      // Debug: Log the raw values from facility
      console.log('🔍 Facility data in SettingsTab:', {
        id: facility.id,
        accepts_insurance: facility.accepts_insurance,
        accepts_insurance_type: typeof facility.accepts_insurance,
        has_delivery: facility.has_delivery,
        has_delivery_type: typeof facility.has_delivery,
        has_consultation: facility.has_consultation,
        has_consultation_type: typeof facility.has_consultation,
      });
      
      // Use original fields if available, otherwise check transformed structure
      let addressValue = '';
      if (facility.address_original) {
        addressValue = facility.address_original;
      } else if (facility.address) {
        if (typeof facility.address === 'string') {
          addressValue = facility.address;
        } else if (facility.address.street) {
          addressValue = facility.address.street;
        }
      }
      
      const convertedAcceptsInsurance = toBoolean(facility.accepts_insurance);
      const convertedHasDelivery = toBoolean(facility.has_delivery);
      const convertedHasConsultation = toBoolean(facility.has_consultation);
      
      console.log('🔍 Converted boolean values:', {
        accepts_insurance: convertedAcceptsInsurance,
        has_delivery: convertedHasDelivery,
        has_consultation: convertedHasConsultation,
      });
      
      setFormData({
        name: facility.name || '',
        address: addressValue,
        city: facility.city || facility.address?.city || '',
        state: facility.state || facility.address?.state || '',
        postal_code: facility.postal_code || facility.address?.zipCode || '',
        phone: facility.phone || '',
        email: facility.email || '',
        website: facility.website || '',
        description: facility.description || '',
        emergency_contact: (facility.emergency_contact !== null && facility.emergency_contact !== undefined) ? facility.emergency_contact : '',
        accepts_insurance: convertedAcceptsInsurance,
        has_delivery: convertedHasDelivery,
        has_consultation: convertedHasConsultation,
        is_active: toBoolean(facility.is_active),
      });

      // Handle both operating_hours (snake_case) and operatingHours (camelCase)
      const hoursData = facility.operating_hours || facility.operatingHours;
      if (hoursData) {
        const hours = typeof hoursData === 'string' 
          ? JSON.parse(hoursData) 
          : hoursData;
        setOperatingHours({
          monday: hours.monday || { open: '08:00', close: '18:00', isOpen: true },
          tuesday: hours.tuesday || { open: '08:00', close: '18:00', isOpen: true },
          wednesday: hours.wednesday || { open: '08:00', close: '18:00', isOpen: true },
          thursday: hours.thursday || { open: '08:00', close: '18:00', isOpen: true },
          friday: hours.friday || { open: '08:00', close: '18:00', isOpen: true },
          saturday: hours.saturday || { open: '09:00', close: '17:00', isOpen: true },
          sunday: hours.sunday || { open: '09:00', close: '17:00', isOpen: true },
        });
      }

      if (facility.services) {
        setServices(typeof facility.services === 'string' 
          ? JSON.parse(facility.services) 
          : facility.services);
      }
    }
  }, [facility]);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        setSelectedImages([...selectedImages, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateOperatingHours = (day: string, field: 'open' | 'close' | 'isOpen', value: any) => {
    setOperatingHours({
      ...operatingHours,
      [day]: {
        ...operatingHours[day as keyof typeof operatingHours],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim() || !formData.city.trim() || !formData.phone.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Name, Address, City, Phone)');
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        ...formData,
        operating_hours: operatingHours,
        services: services,
      };

      const response = await facilitiesService.updateFacility(
        facility.id.toString(),
        updateData,
        selectedImages.length > 0 ? selectedImages : undefined
      );

      if (response.success) {
        // Update formData with response data if available
        if (response.data) {
          const updatedFacility = response.data;
          setFormData({
            ...formData,
            accepts_insurance: Boolean(
              updatedFacility.accepts_insurance === true ||
              updatedFacility.accepts_insurance === 1 ||
              updatedFacility.accepts_insurance === '1' ||
              updatedFacility.accepts_insurance === 'true'
            ),
            has_delivery: Boolean(
              updatedFacility.has_delivery === true ||
              updatedFacility.has_delivery === 1 ||
              updatedFacility.has_delivery === '1' ||
              updatedFacility.has_delivery === 'true'
            ),
            has_consultation: Boolean(
              updatedFacility.has_consultation === true ||
              updatedFacility.has_consultation === 1 ||
              updatedFacility.has_consultation === '1' ||
              updatedFacility.has_consultation === 'true'
            ),
            is_active: Boolean(updatedFacility.is_active !== false && updatedFacility.is_active !== 0 && updatedFacility.is_active !== '0' && updatedFacility.is_active !== 'false'),
          });
        }
        
        Alert.alert('Success', 'Facility updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              setIsEditing(false);
              setSelectedImages([]);
              onUpdate();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update facility');
      }
    } catch (error: any) {
      console.error('Error updating facility:', error);
      Alert.alert('Error', error.message || 'Failed to update facility');
    } finally {
      setLoading(false);
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <View style={styles.tabContent}>
      <ScrollView style={styles.settingsScrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Facility Settings</Text>
          {!isEditing ? (
            <TouchableOpacity
              style={styles.settingsEditButton}
              onPress={() => setIsEditing(true)}
            >
              <FontAwesome name="edit" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.settingsSaveButton, loading && styles.settingsSaveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="check" size={14} color="#fff" />
                    <Text style={styles.settingsSaveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsCancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setSelectedImages([]);
                  // Reset form data
                  if (facility) {
                    // Use original fields if available, otherwise check transformed structure
                    let addressValue = '';
                    if (facility.address_original) {
                      addressValue = facility.address_original;
                    } else if (facility.address) {
                      if (typeof facility.address === 'string') {
                        addressValue = facility.address;
                      } else if (facility.address.street) {
                        addressValue = facility.address.street;
                      }
                    }
                    
                    setFormData({
                      name: facility.name || '',
                      address: addressValue,
                      city: facility.city || facility.address?.city || '',
                      state: facility.state || facility.address?.state || '',
                      postal_code: facility.postal_code || facility.address?.zipCode || '',
                      phone: facility.phone || '',
                      email: facility.email || '',
                      website: facility.website || '',
                      description: facility.description || '',
                      emergency_contact: facility.emergency_contact || (facility.emergency_contact === null ? '' : ''),
                      accepts_insurance: toBoolean(facility.accepts_insurance),
                      has_delivery: toBoolean(facility.has_delivery),
                      has_consultation: toBoolean(facility.has_consultation),
                      is_active: toBoolean(facility.is_active),
                    });
                  }
                }}
                disabled={loading}
              >
                <FontAwesome name="times" size={14} color="#2c3e50" />
                <Text style={styles.settingsCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Facility Name *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter facility name"
              editable={isEditing}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter address"
              editable={isEditing}
              multiline
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
                editable={isEditing}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>State/Region</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.state}
                onChangeText={(text) => setFormData({ ...formData, state: text })}
                placeholder="Enter state"
                editable={isEditing}
              />
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter phone number"
              editable={isEditing}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter email"
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.website}
              onChangeText={(text) => setFormData({ ...formData, website: text })}
              placeholder="https://example.com"
              editable={isEditing}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.emergency_contact}
              onChangeText={(text) => setFormData({ ...formData, emergency_contact: text })}
              placeholder="Enter emergency contact"
              editable={isEditing}
            />
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {days.map((day, index) => {
            const dayHours = operatingHours[day as keyof typeof operatingHours];
            return (
              <View key={day} style={styles.hoursRow}>
                <View style={styles.hoursDay}>
                  <Text style={styles.hoursDayLabel}>{dayLabels[index]}</Text>
                  {isEditing && (
                    <TouchableOpacity
                      style={[styles.toggleSwitch, dayHours.isOpen && styles.toggleSwitchActive]}
                      onPress={() => updateOperatingHours(day, 'isOpen', !dayHours.isOpen)}
                    >
                      <View style={[styles.toggleThumb, dayHours.isOpen && styles.toggleThumbActive]} />
                    </TouchableOpacity>
                  )}
                </View>
                {dayHours.isOpen ? (
                  <View style={styles.hoursTime}>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={[styles.timeInput, { flex: 1, marginRight: 8 }]}
                          value={dayHours.open}
                          onChangeText={(text) => updateOperatingHours(day, 'open', text)}
                          placeholder="08:00"
                        />
                        <Text style={styles.hoursSeparator}>-</Text>
                        <TextInput
                          style={[styles.timeInput, { flex: 1, marginLeft: 8 }]}
                          value={dayHours.close}
                          onChangeText={(text) => updateOperatingHours(day, 'close', text)}
                          placeholder="18:00"
                        />
                      </>
                    ) : (
                      <Text style={styles.hoursDisplay}>
                        {dayHours.open} - {dayHours.close}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Services */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Services</Text>
          {services.length > 0 && (
            <View style={styles.servicesList}>
              {services.map((service, index) => (
                <View key={index} style={styles.settingsServiceTag}>
                  <Text style={styles.serviceTagText}>{service}</Text>
                  {isEditing && (
                    <TouchableOpacity
                      onPress={() => removeService(index)}
                      style={styles.serviceRemoveButton}
                    >
                      <FontAwesome name="times" size={12} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
          {isEditing && (
            <View style={styles.addServiceRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                value={newService}
                onChangeText={setNewService}
                placeholder="Add a service"
                onSubmitEditing={addService}
              />
              <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
                <FontAwesome name="plus" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.settingsTextArea, !isEditing && styles.inputDisabled]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter facility description"
            editable={isEditing}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Features */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Accepts Insurance</Text>
            {isEditing ? (
              <TouchableOpacity
                style={[styles.toggleSwitch, formData.accepts_insurance && styles.toggleSwitchActive]}
                onPress={() => setFormData({ ...formData, accepts_insurance: !formData.accepts_insurance })}
              >
                <View style={[styles.toggleThumb, formData.accepts_insurance && styles.toggleThumbActive]} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.featureValue}>
                {formData.accepts_insurance ? 'Yes' : 'No'}
              </Text>
            )}
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Has Delivery</Text>
            {isEditing ? (
              <TouchableOpacity
                style={[styles.toggleSwitch, formData.has_delivery && styles.toggleSwitchActive]}
                onPress={() => setFormData({ ...formData, has_delivery: !formData.has_delivery })}
              >
                <View style={[styles.toggleThumb, formData.has_delivery && styles.toggleThumbActive]} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.featureValue}>
                {formData.has_delivery ? 'Yes' : 'No'}
              </Text>
            )}
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Has Consultation</Text>
            {isEditing ? (
              <TouchableOpacity
                style={[styles.toggleSwitch, formData.has_consultation && styles.toggleSwitchActive]}
                onPress={() => setFormData({ ...formData, has_consultation: !formData.has_consultation })}
              >
                <View style={[styles.toggleThumb, formData.has_consultation && styles.toggleThumbActive]} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.featureValue}>
                {formData.has_consultation ? 'Yes' : 'No'}
              </Text>
            )}
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Active Status</Text>
            {isEditing ? (
              <TouchableOpacity
                style={[styles.toggleSwitch, formData.is_active && styles.toggleSwitchActive]}
                onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
              >
                <View style={[styles.toggleThumb, formData.is_active && styles.toggleThumbActive]} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.featureValue}>
                {formData.is_active ? 'Active' : 'Inactive'}
              </Text>
            )}
          </View>
        </View>

        {/* Images */}
        {isEditing && (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Add Images</Text>
            <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
              <FontAwesome name="camera" size={20} color="#9b59b6" />
              <Text style={styles.addImageButtonText}>Add Images</Text>
            </TouchableOpacity>
            {selectedImages.length > 0 && (
              <View style={styles.imagesPreview}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.settingsRemoveImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <FontAwesome name="times" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Status Info */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Status Information</Text>
          <View style={styles.statusRow}>
            <Text style={styles.settingsStatusLabel}>Verification Status:</Text>
            <View style={[styles.statusBadge, facility?.is_verified ? styles.settingsVerifiedBadge : styles.settingsPendingBadge]}>
              <FontAwesome
                name={facility?.is_verified ? "check-circle" : "clock-o"}
                size={12}
                color="#fff"
              />
              <Text style={styles.statusBadgeText}>
                {facility?.is_verified ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Staff Management Modal Component
function StaffManagementModal({
  visible,
  staff,
  onClose,
  onUpdate,
  onDelete,
}: {
  visible: boolean;
  staff: StaffMember;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    phone: staff.phone,
    specialty: staff.specialty,
    licenseNumber: staff.licenseNumber,
  });
  const [isVerified, setIsVerified] = useState(staff.isVerified);
  const [profileImage, setProfileImage] = useState<string | null>(staff.profileImage || null);
  const [newProfileImage, setNewProfileImage] = useState<string | null>(null);
  const [originalIsVerified, setOriginalIsVerified] = useState(staff.isVerified);

  useEffect(() => {
    if (visible) {
      setFormData({
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        specialty: staff.specialty,
        licenseNumber: staff.licenseNumber,
      });
      setIsVerified(staff.isVerified);
      setOriginalIsVerified(staff.isVerified);
      setProfileImage(staff.profileImage || null);
      setNewProfileImage(null);
      setIsEditing(false);
    }
  }, [visible, staff]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setNewProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpdate = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const updateData: any = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        specialty: formData.specialty.trim(),
        license_number: formData.licenseNumber.trim(),
      };

      // Only include is_verified if it was actually changed
      if (isVerified !== originalIsVerified) {
        updateData.is_verified = isVerified;
        console.log('🔍 Verification status changed, will update:', isVerified);
      } else {
        console.log('🔍 Verification status unchanged, will not update:', isVerified, '===', originalIsVerified);
      }

      console.log('🔍 Update data being sent:', { ...updateData, profileImage: newProfileImage ? 'present' : 'none' });

      const response = await professionalsService.updateProfessional(
        staff.id,
        updateData,
        newProfileImage || undefined
      );

      if (response.success) {
        console.log('🔍 Update response:', response.data);
        
        // Update the profile image state with the new image URL from response
        if (response.data) {
          // Update profile image if a new one was uploaded or if response has one
          if (response.data.profile_image) {
            const newImageUrl = response.data.profile_image;
            console.log('🔍 Setting new profile image URL:', newImageUrl);
            setProfileImage(newImageUrl);
            setNewProfileImage(null);
          } else if (newProfileImage) {
            // If we uploaded an image but response doesn't have it yet, keep the local one temporarily
            // It will be updated when parent reloads
            console.log('🔍 Using local profile image temporarily:', newProfileImage);
            setProfileImage(newProfileImage);
          }

          // Update verification status only if it was in the response (meaning we changed it)
          if (response.data.is_verified !== undefined && updateData.is_verified !== undefined) {
            console.log('🔍 Updating verification status from response:', response.data.is_verified);
            setIsVerified(response.data.is_verified);
            setOriginalIsVerified(response.data.is_verified);
          }
        }

        Alert.alert('Success', 'Staff member updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              setIsEditing(false);
              // Update parent's selectedStaff with new data
              onUpdate();
            }
          }
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update staff member');
      }
    } catch (error: any) {
      console.error('Error updating staff:', error);
      Alert.alert('Error', error.message || 'Failed to update staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to remove ${staff.firstName} ${staff.lastName} from your facility?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await professionalsService.deleteProfessional(staff.id);
              
              if (response.success) {
                Alert.alert('Success', 'Staff member removed successfully');
                onDelete();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete staff member');
              }
            } catch (error: any) {
              console.error('Error deleting staff:', error);
              Alert.alert('Error', error.message || 'Failed to delete staff member');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
            <Text style={styles.modalTitle}>Manage Staff</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <FontAwesome name="times" size={20} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Profile Image */}
            <View style={styles.profileImageSection}>
              {(newProfileImage || profileImage) ? (
                <Image
                  key={newProfileImage || profileImage || 'profile-image'}
                  source={{ uri: newProfileImage || profileImage || '' }}
                  style={styles.profileImageLarge}
                  onError={() => {
                    console.error('Failed to load profile image');
                    setProfileImage(null);
                  }}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <FontAwesome name="user-md" size={40} color="#9b59b6" />
                </View>
              )}
              {isEditing && (
                <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                  <FontAwesome name="camera" size={16} color="#fff" />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Staff Information */}
            <View style={styles.modalFormSection}>
              <Text style={styles.modalFormLabel}>First Name</Text>
              <TextInput
                style={[styles.modalFormInput, !isEditing && styles.formInputDisabled]}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                editable={isEditing}
                placeholder="First Name"
              />
            </View>

            <View style={styles.modalFormSection}>
              <Text style={styles.modalFormLabel}>Last Name</Text>
              <TextInput
                style={[styles.modalFormInput, !isEditing && styles.formInputDisabled]}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                editable={isEditing}
                placeholder="Last Name"
              />
            </View>

            <View style={styles.modalFormSection}>
              <Text style={styles.modalFormLabel}>Email</Text>
              <TextInput
                style={[styles.modalFormInput, !isEditing && styles.formInputDisabled]}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                editable={isEditing}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email"
              />
            </View>

            <View style={styles.modalFormSection}>
              <Text style={styles.modalFormLabel}>Phone</Text>
              <TextInput
                style={[styles.modalFormInput, !isEditing && styles.formInputDisabled]}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="Phone"
              />
            </View>

            <View style={styles.modalFormSection}>
              <Text style={styles.modalFormLabel}>Specialty</Text>
              <TextInput
                style={[styles.modalFormInput, !isEditing && styles.formInputDisabled]}
                value={formData.specialty}
                onChangeText={(value) => handleInputChange('specialty', value)}
                editable={isEditing}
                placeholder="Specialty"
              />
            </View>

            <View style={styles.modalFormSection}>
              <Text style={styles.modalFormLabel}>License Number</Text>
              <TextInput
                style={[styles.modalFormInput, !isEditing && styles.formInputDisabled]}
                value={formData.licenseNumber}
                onChangeText={(value) => handleInputChange('licenseNumber', value)}
                editable={isEditing}
                placeholder="License Number"
              />
            </View>

            {/* Verification Status */}
            {isEditing && (
              <View style={styles.modalFormSection}>
                <View style={styles.switchRow}>
                  <Text style={styles.modalFormLabel}>Verified Status</Text>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, isVerified && styles.toggleSwitchActive]}
                    onPress={() => {
                      const newValue = !isVerified;
                      console.log('🔍 Toggle verification:', isVerified, '->', newValue);
                      setIsVerified(newValue);
                    }}
                  >
                    <View style={[styles.toggleThumb, isVerified && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.switchHint}>
                  {isVerified ? 'Staff member is verified' : 'Staff member is pending verification'}
                </Text>
              </View>
            )}

            {!isEditing && (
              <View style={styles.statusSection}>
                <Text style={styles.modalStatusLabel}>Status:</Text>
                {isVerified ? (
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
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            {!isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalEditButton]}
                  onPress={() => setIsEditing(true)}
                >
                  <FontAwesome name="edit" size={16} color="#fff" />
                  <Text style={styles.modalButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDelete}
                  disabled={loading}
                >
                  <FontAwesome name="trash" size={16} color="#fff" />
                  <Text style={styles.modalButtonText}>Remove</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditing(false);
                    setNewProfileImage(null);
                    // Reset form data
                    setFormData({
                      firstName: staff.firstName,
                      lastName: staff.lastName,
                      email: staff.email,
                      phone: staff.phone,
                      specialty: staff.specialty,
                      licenseNumber: staff.licenseNumber,
                    });
                    setIsVerified(staff.isVerified);
                    setOriginalIsVerified(staff.isVerified);
                    setProfileImage(staff.profileImage || null);
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.modalButtonText, { color: '#2c3e50' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="check" size={16} color="#fff" />
                      <Text style={styles.modalButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ebf5fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d5f4e6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
    marginLeft: 6,
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
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9b59b6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalFormSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  modalFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalFormInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  formInputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#7f8c8d',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#27ae60',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  switchHint: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  modalStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  modalEditButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Settings Tab Styles
  settingsScrollView: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  settingsEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9b59b6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  settingsSaveButtonDisabled: {
    opacity: 0.6,
  },
  settingsSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  settingsCancelButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#7f8c8d',
  },
  settingsTextArea: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hoursDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  hoursDayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    minWidth: 100,
  },
  hoursTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e9ecef',
    textAlign: 'center',
  },
  hoursSeparator: {
    fontSize: 16,
    color: '#7f8c8d',
    marginHorizontal: 8,
  },
  hoursDisplay: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  closedText: {
    fontSize: 14,
    color: '#e74c3c',
    fontStyle: 'italic',
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  settingsServiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  serviceTagText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  serviceRemoveButton: {
    padding: 2,
  },
  addServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addServiceButton: {
    backgroundColor: '#9b59b6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  featureValue: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9b59b6',
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 12,
  },
  addImageButtonText: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
  },
  imagesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePreviewItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  settingsRemoveImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e74c3c',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  settingsVerifiedBadge: {
    backgroundColor: '#27ae60',
  },
  settingsPendingBadge: {
    backgroundColor: '#f39c12',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

