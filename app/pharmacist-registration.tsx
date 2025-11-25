import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, TextInput, Alert, Switch, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { pharmacistServiceNew, PharmacistRegistration } from '../services/pharmacistServiceNew';

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const BACKGROUND = '#f8f9fa';
const DANGER = '#e74c3c';



export default function PharmacistRegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const facilityId = params.facilityId as string;
  
  // Debug: Log facilityId
  console.log('🔍 Pharmacist Registration - All params:', params);
  console.log('🔍 Pharmacist Registration - facilityId:', facilityId);
  console.log('🔍 Pharmacist Registration - facilityId type:', typeof facilityId);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PharmacistRegistration>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    licenseNumber: '',
    education: '',
    experience: '',
    specializations: [],
    currentWorkplace: '',
    emergencyContact: '',
    bio: '',
    hasConsultation: false,
    hasCompounding: false,
    hasVaccination: false,
    acceptsInsurance: false,
    userId: user?.id || '',
  });

  const availableSpecializations = [
    'Clinical Pharmacy',
    'Hospital Pharmacy',
    'Community Pharmacy',
    'Industrial Pharmacy',
    'Nuclear Pharmacy',
    'Compounding',
    'Oncology Pharmacy',
    'Pediatric Pharmacy',
    'Geriatric Pharmacy',
    'Psychiatric Pharmacy',
    'Critical Care Pharmacy',
    'Ambulatory Care',
    'Drug Information',
    'Pharmacy Management',
    'Research & Development',
    'Regulatory Affairs'
  ];

  const toggleSpecialization = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const selectProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstName.trim()) {
      Alert.alert('Error', 'Please enter first name');
      return;
    }
    if (!formData.lastName.trim()) {
      Alert.alert('Error', 'Please enter last name');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter city');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter license number');
      return;
    }
    if (!formData.education.trim()) {
      Alert.alert('Error', 'Please enter education');
      return;
    }
    if (formData.education.trim().length < 5) {
      Alert.alert('Error', 'Education must be at least 5 characters long');
      return;
    }
    if (!formData.experience.trim()) {
      Alert.alert('Error', 'Please enter experience');
      return;
    }
    if (formData.specializations.length === 0) {
      Alert.alert('Error', 'Please select at least one specialization');
      return;
    }
    if (!formData.emergencyContact.trim()) {
      Alert.alert('Error', 'Please enter emergency contact');
      return;
    }
    if (formData.bio.trim() && formData.bio.trim().length < 10) {
      Alert.alert('Error', 'Bio must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔍 Submitting pharmacist registration:', formData);
      
      // Add profile image and facilityId to form data
      const registrationData = {
        ...formData,
        profileImage: profileImage,
        facilityId: facilityId ? parseInt(facilityId) : undefined
      };
      
      console.log('🔍 Registration data being sent:', {
        ...registrationData,
        profileImage: profileImage ? 'provided' : 'not provided',
        facilityId: registrationData.facilityId
      });
      
      const response = await pharmacistServiceNew.registerPharmacist(registrationData);
      
      if (response.success) {
        Alert.alert(
          'Registration Successful!',
          response.message,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', response.message || 'Failed to register pharmacist. Please check your information and try again.');
      }
    } catch (error: any) {
      console.error('❌ Pharmacist registration error:', error);
      
      // Extract error message from response if available
      let errorMessage = 'Failed to submit registration. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // If there are validation errors, show the first one
        const firstError = error.response.data.errors[0];
        errorMessage = firstError.msg || firstError.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <LinearGradient
        colors={['#9b59b6', '#8e44ad']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacist Registration</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 1 of 1</Text>
        </View>

        {/* Form Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                placeholder="Enter first name"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                placeholder="Enter last name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Enter email address"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Image</Text>
            <TouchableOpacity style={styles.imageUploadContainer} onPress={selectProfileImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <FontAwesome name="camera" size={24} color="#ccc" />
                  <Text style={styles.imagePlaceholderText}>Tap to add profile image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Enter full address"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
              placeholder="Enter city"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, licenseNumber: text }))}
              placeholder="Enter pharmacist license number"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Education</Text>
            <TextInput
              style={styles.input}
              value={formData.education}
              onChangeText={(text) => setFormData(prev => ({ ...prev, education: text }))}
              placeholder="e.g., PharmD, B.Pharm, etc. (minimum 5 characters)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              value={formData.experience}
              onChangeText={(text) => setFormData(prev => ({ ...prev, experience: text }))}
              placeholder="Enter years of experience"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Workplace</Text>
            <TextInput
              style={styles.input}
              value={formData.currentWorkplace}
              onChangeText={(text) => setFormData(prev => ({ ...prev, currentWorkplace: text }))}
              placeholder="Enter current workplace"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations</Text>
          
          <View style={styles.specializationsContainer}>
            {availableSpecializations.map((specialization) => (
              <TouchableOpacity
                key={specialization}
                style={[
                  styles.specializationChip,
                  formData.specializations.includes(specialization) && styles.specializationChipSelected
                ]}
                onPress={() => toggleSpecialization(specialization)}
              >
                <Text style={[
                  styles.specializationChipText,
                  formData.specializations.includes(specialization) && styles.specializationChipTextSelected
                ]}>
                  {specialization}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          
          <View style={styles.switchGroup}>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Patient Consultations</Text>
              <Switch
                value={formData.hasConsultation}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasConsultation: value }))}
                trackColor={{ false: '#ecf0f1', true: '#9b59b6' }}
                thumbColor={formData.hasConsultation ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Compounding Services</Text>
              <Switch
                value={formData.hasCompounding}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasCompounding: value }))}
                trackColor={{ false: '#ecf0f1', true: '#9b59b6' }}
                thumbColor={formData.hasCompounding ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Vaccination Services</Text>
              <Switch
                value={formData.hasVaccination}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasVaccination: value }))}
                trackColor={{ false: '#ecf0f1', true: '#9b59b6' }}
                thumbColor={formData.hasVaccination ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Accepts Insurance</Text>
              <Switch
                value={formData.acceptsInsurance}
                onValueChange={(value) => setFormData(prev => ({ ...prev, acceptsInsurance: value }))}
                trackColor={{ false: '#ecf0f1', true: '#9b59b6' }}
                thumbColor={formData.acceptsInsurance ? '#fff' : '#bdc3c7'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <TextInput
              style={styles.input}
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContact: text }))}
              placeholder="Enter emergency contact number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about your experience and expertise... (minimum 10 characters)"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <FontAwesome name="spinner" size={20} color="white" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Registration</Text>
          )}
        </TouchableOpacity>
              </ScrollView>
        </KeyboardAvoidingView>
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
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9b59b6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  specializationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  specializationChipSelected: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  specializationChipText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  specializationChipTextSelected: {
    color: 'white',
  },
  switchGroup: {
    marginTop: 8,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  switchLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#9b59b6',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(155, 89, 182, 0.6)',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageUploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
}); 