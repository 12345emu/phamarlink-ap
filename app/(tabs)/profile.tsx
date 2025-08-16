import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, View, Text, Modal, TextInput, KeyboardAvoidingView, Platform, Linking, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { authService, User } from '../../services/authService';
import ProfileImage from '../../components/ProfileImage';
import { constructProfileImageUrl } from '../../utils/imageUtils';

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const BACKGROUND = '#f8f9fa';
const DANGER = '#e74c3c';

interface UserProfile {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  emergencyContact: string;
  insuranceProvider: string;
  insuranceNumber: string;
  bloodType: string;
  allergies: string;
  medicalHistory: string;
}

interface EditField {
  label: string;
  key: keyof UserProfile;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
}

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [pressedIcon, setPressedIcon] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const router = useRouter();
  const { profileImage, updateProfileImage } = useProfile();
  const { logout: authLogout, user: authUser } = useAuth();

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "Loading...",
    lastName: "Loading...",
    name: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    address: "Loading...",
    dateOfBirth: "Loading...",
    emergencyContact: "Loading...",
    insuranceProvider: "Loading...",
    insuranceNumber: "Loading...",
    bloodType: "Loading...",
    allergies: "Loading...",
    medicalHistory: "Loading..."
  });

  // Fetch user profile data from API
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getProfile();
      
      if (response.success && response.data) {
        setUserData(response.data);
        
        // Update profile image if available
        if (response.data.profileImage) {
          const fullImageUrl = constructProfileImageUrl(response.data.profileImage);
          updateProfileImage(fullImageUrl);
        }
        
        // Transform API data to match UserProfile interface
        const profileData: UserProfile = {
          firstName: response.data.firstName || 'Not specified',
          lastName: response.data.lastName || 'Not specified',
          name: `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim() || 'Not specified',
          email: response.data.email || 'Not specified',
          phone: response.data.phone || 'Not specified',
          address: (response.data as any).patientProfile?.address || 'Not specified',
          dateOfBirth: response.data.dateOfBirth ? formatDateForDisplay(new Date(response.data.dateOfBirth)) : 'Not specified',
          emergencyContact: (response.data as any).patientProfile?.emergency_contact || 'Not specified',
          insuranceProvider: (response.data as any).patientProfile?.insurance_provider || 'Not specified',
          insuranceNumber: (response.data as any).patientProfile?.insurance_number || 'Not specified',
          bloodType: (response.data as any).patientProfile?.blood_type || 'Not specified',
          allergies: (response.data as any).patientProfile?.allergies || 'Not specified',
          medicalHistory: (response.data as any).patientProfile?.medical_history || 'Not specified'
        };
        
        setUserProfile(profileData);
      } else {
        console.error('Failed to fetch profile:', response.message);
        Alert.alert('Error', 'Failed to load profile data. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = () => {
    fetchUserProfile();
  };

  const handleRateApp = () => {
    setSelectedRating(0);
    setFeedbackText('');
    setRateModalVisible(true);
  };

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleUpdateProfileImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to update your profile picture.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show image picker options
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => pickImage('camera')
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => pickImage('library')
        }
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setIsUpdatingImage(true);
      
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Upload image to API
        const response = await authService.uploadProfileImage(imageUri);
        
        if (response.success && response.data) {
          // Update local profile image with the server URL
          updateProfileImage(response.data.profileImage);
          
          // Update user data with new profile image
          if (userData) {
            setUserData({
              ...userData,
              profileImage: response.data.profileImage
            });
          }
          
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          Alert.alert('Error', response.message || 'Failed to upload profile picture. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setIsSubmittingRating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setRateModalVisible(false);
      setSelectedRating(0);
      setFeedbackText('');
      
      // Show different actions based on rating
      if (selectedRating >= 4) {
        Alert.alert(
          'Thank You!',
          'We\'re glad you love PharmaLink! Would you like to rate us on the App Store?',
          [
            { text: 'Not Now', style: 'cancel' },
            { 
              text: 'Rate on App Store', 
              onPress: () => {
                // Open App Store rating page
                const appStoreUrl = 'https://apps.apple.com/app/pharmalink/id123456789';
                Linking.openURL(appStoreUrl).catch(() => {
                  Alert.alert('Error', 'Could not open App Store');
                });
              }
            }
          ]
        );
      } else if (selectedRating >= 3) {
        Alert.alert(
          'Thank You!',
          'We appreciate your feedback. We\'re working to make PharmaLink even better!',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Thank You!',
          'We\'re sorry to hear that. Your feedback helps us improve. Would you like to contact our support team?',
          [
            { text: 'No Thanks', style: 'cancel' },
            { 
              text: 'Contact Support', 
              onPress: () => handleAction('Contact Support')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: "user", label: "Name", value: userProfile.name, editable: true, key: 'name' as keyof UserProfile },
        { icon: "envelope", label: "Email", value: userProfile.email, editable: true, key: 'email' as keyof UserProfile },
        { icon: "phone", label: "Phone", value: userProfile.phone, editable: true, key: 'phone' as keyof UserProfile },
        { icon: "map-marker", label: "Address", value: userProfile.address, editable: true, key: 'address' as keyof UserProfile },
        { icon: "calendar", label: "Date of Birth", value: userProfile.dateOfBirth, editable: true, key: 'dateOfBirth' as keyof UserProfile }
      ]
    },
    {
      title: "Medical Information",
      items: [
        { icon: "phone", label: "Emergency Contact", value: userProfile.emergencyContact, editable: true, key: 'emergencyContact' as keyof UserProfile },
        { icon: "shield", label: "Insurance Provider", value: userProfile.insuranceProvider, editable: true, key: 'insuranceProvider' as keyof UserProfile },
        { icon: "credit-card", label: "Insurance Number", value: userProfile.insuranceNumber, editable: true, key: 'insuranceNumber' as keyof UserProfile },
        { icon: "tint", label: "Blood Type", value: userProfile.bloodType, editable: true, key: 'bloodType' as keyof UserProfile },
        { icon: "exclamation-triangle", label: "Allergies", value: userProfile.allergies, editable: true, key: 'allergies' as keyof UserProfile },
        { icon: "file-medical", label: "Medical History", value: userProfile.medicalHistory, editable: true, key: 'medicalHistory' as keyof UserProfile }
      ]
    }
  ];

  const settingsSections = [
    {
      title: "Preferences",
      items: [
        {
          icon: "bell",
          label: "Push Notifications",
          type: "switch",
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled
        },
        {
          icon: "map-marker",
          label: "Location Services",
          type: "switch",
          value: locationEnabled,
          onValueChange: setLocationEnabled
        },
        {
          icon: "moon-o",
          label: "Dark Mode",
          type: "switch",
          value: darkModeEnabled,
          onValueChange: setDarkModeEnabled
        }
      ]
    },
    {
      title: "Account",
      items: [
        { icon: "lock", label: "Change Password", type: "action" },
        { icon: "credit-card", label: "Payment Methods", type: "action" },
        { icon: "file-text", label: "Prescriptions", type: "action" },
        { icon: "history", label: "Order History", type: "action" }
      ]
    },
    {
      title: "Support",
      items: [
        { icon: "question-circle", label: "Help & FAQ", type: "action" },
        { icon: "envelope", label: "Contact Support", type: "action" },
        { icon: "star", label: "Rate App", type: "action" },
        { icon: "info-circle", label: "About", type: "action" }
      ]
    }
  ];

  const handleEditField = (item: any) => {
    if (item.key === 'dateOfBirth') {
      // Handle date of birth with date picker
      let currentDate = new Date(1990, 0, 15); // Default to January 15, 1990
      
      try {
        if (item.value && item.value !== '') {
          // Parse "January 15, 1990" format
          const dateParts = item.value.split(' ');
          if (dateParts.length >= 3) {
            const monthName = dateParts[0];
            const day = parseInt(dateParts[1].replace(',', ''));
            const year = parseInt(dateParts[2]);
            
            // Create date using year, month index, day
            const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
            const parsedDate = new Date(year, monthIndex, day);
            
            if (!isNaN(parsedDate.getTime())) {
              currentDate = parsedDate;
            }
          }
        }
      } catch (error) {
        console.log('Date parsing error:', error);
      }
      
      console.log('Setting selected date to:', currentDate);
      setSelectedDate(currentDate);
      setShowDatePicker(true);
      return;
    }

    // Special handling for name field
    if (item.key === 'name') {
      const editField: EditField = {
        label: item.label,
        key: item.key,
        value: item.value,
        placeholder: `Enter your ${item.label.toLowerCase()}`,
        keyboardType: 'default',
        multiline: false
      };
      
      setEditingField(editField);
      // Set the current first and last name values
      setEditFirstName(userProfile.firstName !== 'Not specified' ? userProfile.firstName : '');
      setEditLastName(userProfile.lastName !== 'Not specified' ? userProfile.lastName : '');
      setEditModalVisible(true);
      return;
    }

    const editField: EditField = {
      label: item.label,
      key: item.key,
      value: item.value,
      placeholder: `Enter your ${item.label.toLowerCase()}`,
      keyboardType: item.key === 'email' ? 'email-address' : 
                   item.key === 'phone' || item.key === 'emergencyContact' ? 'phone-pad' :
                   item.key === 'insuranceNumber' ? 'numeric' : 'default',
      multiline: item.key === 'address'
    };
    
    setEditingField(editField);
    setEditValue(item.value);
    setEditModalVisible(true);
  };



  const handleSaveEdit = async () => {
    if (!editingField) {
      Alert.alert('Error', 'No field selected for editing');
      return;
    }

    // Special validation for name field
    if (editingField.key === 'name') {
      if (!editFirstName.trim() || !editLastName.trim()) {
        Alert.alert('Error', 'Please enter both first name and last name');
        return;
      }
    } else if (!editValue.trim()) {
      Alert.alert('Error', 'Please enter a valid value');
      return;
    }

    // Validation
    if (editingField.key === 'email' && !isValidEmail(editValue)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if ((editingField.key === 'phone' || editingField.key === 'emergencyContact') && !isValidPhone(editValue)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare update data based on field type
      let updateData: any = {};
      
      switch (editingField.key) {
        case 'name':
          // Handle name field with separate first and last name
          updateData.firstName = editFirstName.trim();
          updateData.lastName = editLastName.trim();
          break;
        case 'email':
          updateData.email = editValue.trim();
          break;
        case 'phone':
          updateData.phone = editValue.trim();
          break;
        case 'address':
          // For now, we'll store address as a simple string
          // In a real app, you might want to parse this into address object
          updateData.address = editValue.trim();
          break;
        case 'dateOfBirth':
          // Convert display format back to ISO format
          const dateParts = editValue.trim().split(' ');
          if (dateParts.length >= 3) {
            const monthName = dateParts[0];
            const day = parseInt(dateParts[1].replace(',', ''));
            const year = parseInt(dateParts[2]);
            const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
            const date = new Date(year, monthIndex, day);
            updateData.dateOfBirth = date.toISOString().split('T')[0];
          }
          break;
        case 'emergencyContact':
        case 'insuranceProvider':
        case 'insuranceNumber':
        case 'bloodType':
        case 'allergies':
        case 'medicalHistory':
          // These are patient profile fields, handle them separately
          const patientProfileData: any = {};
          
          switch (editingField.key) {
            case 'emergencyContact':
              patientProfileData.emergency_contact = editValue.trim();
              break;
            case 'insuranceProvider':
              patientProfileData.insurance_provider = editValue.trim();
              break;
            case 'insuranceNumber':
              patientProfileData.insurance_number = editValue.trim();
              break;
            case 'bloodType':
              patientProfileData.blood_type = editValue.trim();
              break;
            case 'allergies':
              patientProfileData.allergies = editValue.trim();
              break;
            case 'medicalHistory':
              patientProfileData.medical_history = editValue.trim();
              break;
          }
          
          // Call the API to update patient profile
          const patientResponse = await authService.updatePatientProfile(patientProfileData);
          
          if (patientResponse.success && patientResponse.data) {
            // Update local profile state
            setUserProfile(prev => ({
              ...prev,
              [editingField.key]: editValue.trim()
            }));
            
            // Refresh profile data from server to ensure consistency
            await fetchUserProfile();
            
            setEditModalVisible(false);
            setEditingField(null);
            setEditValue('');
            
            Alert.alert('Success', `${editingField.label} updated successfully!`);
          } else {
            Alert.alert('Error', patientResponse.message || 'Failed to update patient profile. Please try again.');
          }
          setIsSaving(false);
          return;
        default:
          updateData[editingField.key] = editValue.trim();
      }

      // Call the API to update profile
      const response = await authService.updateProfile(updateData);
      
      if (response.success && response.data) {
        // Update local user data
        setUserData(response.data);
        
        // Refresh profile data from server to ensure consistency
        await fetchUserProfile();
        
        setEditModalVisible(false);
        setEditingField(null);
        setEditValue('');
        
        Alert.alert('Success', `${editingField.label} updated successfully!`);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleAction = (action: string) => {
    if (action.includes('Edit')) {
      // Find the field to edit
      const fieldName = action.replace('Edit ', '');
      const section = profileSections.find(section => 
        section.items.some(item => item.label === fieldName)
      );
      
      if (section) {
        const item = section.items.find(item => item.label === fieldName);
        if (item) {
          handleEditField(item);
        }
      }
    } else if (action === 'Rate App') {
      handleRateApp();
    } else if (action.includes('Register')) {
      // Handle registration actions
      switch (action) {
        case 'Register Pharmacy':
          router.push('/pharmacy-registration');
          break;
        case 'Register Hospital':
          router.push('/hospital-registration');
          break;
        case 'Register as Pharmacist':
          router.push('/pharmacist-registration');
          break;
        case 'Register as Doctor':
          router.push('/doctor-registration');
          break;
        default:
          Alert.alert('Action', `${action} would be implemented here`);
      }
    } else {
    Alert.alert('Action', `${action} would be implemented here`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await authLogout();
              // Navigate to login page after logout
              router.push('/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const renderProfileSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={styles.profileItem}
          onPress={() => item.editable && handleEditField(item)}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <View style={styles.iconContainer}>
              <FontAwesome name={item.icon as any} size={18} color={ACCENT} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          </View>
          {item.editable && (
            <FontAwesome name="chevron-right" size={16} color="#95a5a6" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSettingsSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.settingsItem,
            section.title === "Registration" && styles.registrationItem
          ]}
          onPress={() => {
            if (item.type === 'action') {
              if (item.label === 'Rate App') {
                handleRateApp();
              } else {
                handleAction(item.label);
              }
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <View style={[
              styles.iconContainer,
              section.title === "Registration" && styles.registrationIconContainer
            ]}>
              <FontAwesome 
                name={item.icon as any} 
                size={18} 
                color={section.title === "Registration" ? SUCCESS : ACCENT} 
              />
            </View>
            <Text style={[
              styles.itemLabel,
              section.title === "Registration" && styles.registrationLabel
            ]}>
              {item.label}
            </Text>
          </View>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#ecf0f1', true: SUCCESS }}
              thumbColor={item.value ? '#fff' : '#bdc3c7'}
              ios_backgroundColor="#ecf0f1"
            />
          ) : (
            <FontAwesome 
              name="chevron-right" 
              size={16} 
              color={section.title === "Registration" ? SUCCESS : "#95a5a6"} 
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleRefreshProfile} style={styles.refreshButton}>
            <FontAwesome name="refresh" size={16} color={ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRateApp} style={styles.rateButton}>
            <FontAwesome name="star" size={16} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleUpdateProfileImage}
            activeOpacity={0.8}
            disabled={isUpdatingImage}
          >
            <View style={styles.avatarBackground}>
              <ProfileImage size={80} showBorder={false} />
              
              {/* Camera Icon Overlay */}
              <View style={styles.cameraIconOverlay}>
                <FontAwesome 
                  name="camera" 
                  size={16} 
                  color="white" 
                />
              </View>
              
              {/* Loading Overlay */}
              {isUpdatingImage && (
                <View style={styles.loadingOverlay}>
                  <FontAwesome name="spinner" size={20} color="white" />
                </View>
              )}
          </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        {/* Profile Sections */}
        {profileSections.map(renderProfileSection)}
        
        {/* Registration Section */}
        <View style={styles.registrationSection}>
          <Text style={styles.sectionTitle}>Registration</Text>
          <View style={styles.registrationGrid}>
            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'pharmacy' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register Pharmacy')}
              onPressIn={() => setPressedIcon('pharmacy')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'pharmacy' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="medkit" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Pharmacy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'hospital' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register Hospital')}
              onPressIn={() => setPressedIcon('hospital')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'hospital' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="hospital-o" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Hospital</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'pharmacist' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register as Pharmacist')}
              onPressIn={() => setPressedIcon('pharmacist')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'pharmacist' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="user-md" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Pharmacist</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'doctor' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register as Doctor')}
              onPressIn={() => setPressedIcon('doctor')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'doctor' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="stethoscope" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Doctor</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map(renderSettingsSection)}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <FontAwesome name="sign-out" size={20} color={DANGER} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editingField?.label}</Text>
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={20} color="#95a5a6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {editingField?.key === 'name' ? (
                // Special layout for name editing with two fields
                <>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    placeholder="Enter your first name"
                    keyboardType="default"
                    autoFocus={true}
                    returnKeyType="next"
                  />
                  
                  <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Last Name</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editLastName}
                    onChangeText={setEditLastName}
                    placeholder="Enter your last name"
                    keyboardType="default"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveEdit}
                  />
                </>
              ) : (
                // Regular single field layout
                <>
                  <Text style={styles.fieldLabel}>{editingField?.label}</Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      editingField?.multiline && styles.multilineInput
                    ]}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder={editingField?.placeholder}
                    keyboardType={editingField?.keyboardType || 'default'}
                    multiline={editingField?.multiline}
                    numberOfLines={editingField?.multiline ? 3 : 1}
                    autoFocus={true}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveEdit}
                  />
                </>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled
                ]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <View style={styles.inlineLoadingContainer}>
                    <FontAwesome name="spinner" size={16} color="white" />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
                  </KeyboardAvoidingView>
        </Modal>

        {/* Rate App Modal */}
        <Modal
          visible={rateModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setRateModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rate PharmaLink</Text>
                <TouchableOpacity 
                  onPress={() => setRateModalVisible(false)}
                  style={styles.closeButton}
                >
                  <FontAwesome name="times" size={20} color="#95a5a6" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.ratingTitle}>How would you rate your experience?</Text>
                
                {/* Star Rating */}
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleRatingSelect(star)}
                      style={styles.starButton}
                      activeOpacity={0.7}
                    >
                      <FontAwesome
                        name={selectedRating >= star ? "star" : "star-o"}
                        size={32}
                        color={selectedRating >= star ? "#f39c12" : "#bdc3c7"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.ratingText}>
                  {selectedRating === 0 && "Tap a star to rate"}
                  {selectedRating === 1 && "Poor"}
                  {selectedRating === 2 && "Fair"}
                  {selectedRating === 3 && "Good"}
                  {selectedRating === 4 && "Very Good"}
                  {selectedRating === 5 && "Excellent"}
                </Text>

                {/* Feedback Input */}
                <Text style={styles.fieldLabel}>Additional Feedback (Optional)</Text>
                <TextInput
                  style={[styles.editInput, styles.multilineInput]}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder="Tell us what you think about PharmaLink..."
                  multiline={true}
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{feedbackText.length}/500</Text>
              </View>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setRateModalVisible(false)}
                  disabled={isSubmittingRating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (selectedRating === 0 || isSubmittingRating) && styles.saveButtonDisabled
                  ]}
                  onPress={handleSubmitRating}
                  disabled={selectedRating === 0 || isSubmittingRating}
                >
                  {isSubmittingRating ? (
                    <View style={styles.inlineLoadingContainer}>
                      <FontAwesome name="spinner" size={16} color="white" />
                      <Text style={styles.saveButtonText}>Submitting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveButtonText}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(false)}
                    style={styles.closeButton}
                  >
                    <FontAwesome name="times" size={20} color="#95a5a6" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalContent}>
                  <Text style={styles.datePickerLabel}>
                    Selected: {formatDateForDisplay(selectedDate)}
                  </Text>
                  
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        console.log('DateTimePicker onChange:', event.type, date);
                        if (date && event.type !== 'dismissed') {
                          setSelectedDate(date);
                        }
                      }}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      style={styles.datePicker}
                      textColor="#000000"
                      accentColor="#3498db"
                    />
                  </View>
                </View>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      try {
                        const formattedDate = formatDateForDisplay(selectedDate);
                        
                        // Convert date to ISO format for API
                        const isoDate = selectedDate.toISOString().split('T')[0];
                        
                        // Call API to update date of birth
                        const updateData = {
                          dateOfBirth: isoDate
                        };
                        
                        console.log('🔍 Frontend - Sending date update:', updateData);
                        const response = await authService.updateProfile(updateData);
                        
                        if (response.success && response.data) {
                          // Update local user data
                          setUserData(response.data);
                          
                          // Refresh profile data from server to ensure consistency
                          await fetchUserProfile();
                          
                          setShowDatePicker(false);
                          Alert.alert('Success', 'Date of birth updated successfully!');
                        } else {
                          Alert.alert('Error', response.message || 'Failed to update date of birth. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error updating date of birth:', error);
                        Alert.alert('Error', 'Failed to update date of birth. Please try again.');
                      }
                    }}
                  >
                    <Text style={styles.saveButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUCCESS,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    color: '#2c3e50',
    marginBottom: 3,
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: DANGER,
    marginLeft: 12,
  },
  registrationItem: {
    backgroundColor: 'rgba(67, 233, 123, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: SUCCESS,
  },

  registrationLabel: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  registrationSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  registrationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  registrationIcon: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 70,
  },
  registrationIconPressed: {
    transform: [{ scale: 0.95 }],
  },
  registrationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  registrationIconContainerPressed: {
    backgroundColor: 'rgba(67, 233, 123, 0.2)',
    transform: [{ scale: 0.9 }],
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Modal Styles
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
    maxWidth: 400,
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: SUCCESS,
    marginLeft: 8,
    alignItems: 'center',
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(67, 233, 123, 0.5)',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  inlineLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Rating Modal Styles
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  starButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  charCount: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'right',
    marginTop: 4,
  },
  // Profile Image Styles
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16,
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    minHeight: 200,
  },
  datePicker: {
    width: '100%',
    height: 200,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
}); 