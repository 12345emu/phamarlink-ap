import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Image,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { hospitalService, HospitalRegistration } from '../services/hospitalService';

// Constants
const ACCENT = '#3498db';
const BACKGROUND = '#f8f9fa';
const TEXT_PRIMARY = '#2c3e50';
const TEXT_SECONDARY = '#7f8c8d';
const BORDER = '#e9ecef';
const DANGER = '#e74c3c';

// Google Maps API Key (you'll need to add your own API key)
// To get a Google Maps API key:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable Geocoding API and Places API
// 4. Create credentials (API key)
// 5. Replace 'YOUR_GOOGLE_MAPS_API_KEY' with your actual API key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBsCGBtOteigRK5_Uld_yKuUyoEjCKGWyg'; // Replace with your actual API key

interface FormData {
  hospitalName: string;
  administratorName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  licenseNumber: string;
  registrationNumber: string;
  specialties: string[];
  bedCapacity: string;
  emergencyContact: string;
  description: string;
  hasEmergency: boolean;
  hasICU: boolean;
  hasAmbulance: boolean;
  acceptsInsurance: boolean;
}


export default function HospitalRegistrationScreen() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Debug logging
  console.log('HospitalRegistrationScreen render');
  const [formData, setFormData] = useState<FormData>({
    hospitalName: '',
    administratorName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    licenseNumber: '',
    registrationNumber: '',
    specialties: [],
    bedCapacity: '',
    emergencyContact: '',
    description: '',
    hasEmergency: false,
    hasICU: false,
    hasAmbulance: false,
    acceptsInsurance: false,
  });
  
  // Debug logging
  console.log('HospitalRegistrationScreen render - latitude:', formData.latitude, 'longitude:', formData.longitude);
  
  // Monitor formData changes
  useEffect(() => {
    console.log('formData changed - latitude:', formData.latitude, 'longitude:', formData.longitude);
  }, [formData.latitude, formData.longitude]);

  const availableSpecialties = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Obstetrics & Gynecology',
    'General Surgery',
    'Internal Medicine',
    'Emergency Medicine',
    'Radiology',
    'Oncology',
    'Dermatology',
    'Psychiatry',
    'Ophthalmology',
    'ENT',
    'Urology',
    'Gastroenterology'
  ];

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera roll permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages]);
        console.log('✅ Images selected:', newImages);
      }
    } catch (error) {
      console.error('❌ Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Google Maps API function to get precise location
  const getLocationFromGoogleMaps = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components;
        
        let streetNumber = '';
        let route = '';
        let locality = '';
        let administrativeArea = '';
        let country = '';
        let postalCode = '';
        
        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('locality')) {
            locality = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            administrativeArea = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          } else if (types.includes('postal_code')) {
            postalCode = component.long_name;
          }
        });
        
        return {
          address: streetNumber && route ? `${streetNumber} ${route}` : route || result.formatted_address,
          city: locality,
          region: administrativeArea,
          postalCode,
          country,
          formattedAddress: result.formatted_address
        };
      }
    } catch (error) {
      console.error('❌ Google Maps API error:', error);
    }
    return null;
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      console.log('🔍 Getting current location for hospital registration...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to get your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // 10 seconds timeout
        distanceInterval: 1, // 1 meter accuracy
      });

      console.log('🔍 Location obtained:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed
      });

      // Try Google Maps API first for more accurate location
      let googleLocationData = null;
      if (GOOGLE_MAPS_API_KEY !== 'AIzaSyBsCGBtOteigRK5_Uld_yKuUyoEjCKGWyg') {
        console.log('🔍 Trying Google Maps API for precise location...');
        googleLocationData = await getLocationFromGoogleMaps(
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('🔍 Google Maps location data:', googleLocationData);
      }

      // Fallback to Expo Location reverse geocoding
      let addressInfo;
      try {
        addressInfo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('🔍 Expo Location address info:', addressInfo);
      } catch (error) {
        console.log('❌ Error getting address from Expo Location:', error);
        addressInfo = [];
      }

      // Extract address components with Google Maps priority
      let finalAddress = '';
      let finalCity = '';
      let finalRegion = '';
      let finalPostalCode = '';
      
      // Use Google Maps data if available (more accurate)
      if (googleLocationData) {
        finalAddress = googleLocationData.address;
        finalCity = googleLocationData.city;
        finalRegion = googleLocationData.region;
        finalPostalCode = googleLocationData.postalCode;
        console.log('🔍 Using Google Maps location data');
      } else {
        // Fallback to Expo Location data
        const addressData = addressInfo && addressInfo.length > 0 ? addressInfo[0] : {};
        console.log('🔍 Raw Expo Location address data:', addressData);
        
        // Try multiple property names for each component
        finalAddress = addressData.street || addressData.name || addressData.thoroughfare || '';
        finalCity = addressData.city || addressData.subregion || addressData.locality || '';
        finalRegion = addressData.region || addressData.administrativeArea || addressData.area || '';
        
        // Try multiple property names for postal code
        const postalCode = (addressData as any).postalCode || 
                          (addressData as any).postal || 
                          (addressData as any).postcode || 
                          (addressData as any).zipCode || 
                          (addressData as any).zip || 
                          '';
        
        finalPostalCode = postalCode;
        console.log('🔍 Using Expo Location data');
      }
      
      // If no address data from geocoding, create a basic address from coordinates
      if (!finalAddress) {
        finalAddress = `Location at ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }
      
      if (!finalCity) {
        finalCity = 'Unknown City';
      }
      
      if (!finalRegion) {
        finalRegion = 'Unknown Region';
      }
      
      // Handle postal code with fallback
      if (!finalPostalCode) {
        // Default Ghana postal code
        finalPostalCode = '00233';
        console.log('🔍 Using default Ghana postal code:', finalPostalCode);
      }
      
      console.log('🔍 Extracted address components:', {
        address: finalAddress,
        city: finalCity,
        region: finalRegion,
        postalCode: finalPostalCode
      });

      setFormData(prev => {
        const newData = {
          ...prev,
          latitude: location.coords.latitude.toFixed(8), // 8 decimal places for maximum precision
          longitude: location.coords.longitude.toFixed(8), // 8 decimal places for maximum precision
          address: finalAddress,
          city: finalCity,
          region: finalRegion,
          postalCode: finalPostalCode,
        };
        console.log('✅ Updated formData with real coordinates:', newData.latitude, newData.longitude);
        return newData;
      });
      
      // Force a small delay to ensure form updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a detailed success message with accuracy information
      const accuracyText = location.coords.accuracy ? 
        `\nAccuracy: ±${Math.round(location.coords.accuracy)} meters` : 
        '\nAccuracy: High precision';
      
      let successMessage = 'Your current location has been set successfully!\n\n';
      if (finalAddress) successMessage += `📍 Address: ${finalAddress}\n`;
      if (finalCity) successMessage += `🏙️ City: ${finalCity}\n`;
      if (finalRegion) successMessage += `🏛️ Region: ${finalRegion}\n`;
      if (finalPostalCode) successMessage += `📮 Postal Code: ${finalPostalCode}\n`;
      successMessage += `🌍 Coordinates: ${location.coords.latitude.toFixed(8)}, ${location.coords.longitude.toFixed(8)}${accuracyText}`;
      
      // Add location quality indicator
      if (location.coords.accuracy) {
        if (location.coords.accuracy <= 5) {
          successMessage += '\n✅ Location Quality: Excellent';
        } else if (location.coords.accuracy <= 20) {
          successMessage += '\n✅ Location Quality: Good';
        } else if (location.coords.accuracy <= 100) {
          successMessage += '\n⚠️ Location Quality: Fair';
        } else {
          successMessage += '\n⚠️ Location Quality: Poor - Consider moving to a better location';
        }
      }
      
      Alert.alert('Location Updated', successMessage);
      
    } catch (error) {
      console.error('❌ Error in getCurrentLocation:', error);
      Alert.alert('Error', 'Could not get your current location. Please try again or enter manually.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.hospitalName.trim()) {
      Alert.alert('Error', 'Please enter hospital name');
      return;
    }
    if (!formData.administratorName.trim()) {
      Alert.alert('Error', 'Please enter administrator name');
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

    // Phone number validation (Ghana format)
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert('Error', 'Please enter a valid Ghana phone number (e.g., 0501234567 or +233501234567)');
      return;
    }

    // Address length validation
    if (formData.address.trim().length < 5) {
      Alert.alert('Error', 'Please enter a more detailed address (at least 5 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔍 Submitting hospital registration...');
      console.log('🔍 Form data:', formData);
      console.log('🔍 Location data:', {
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        postalCode: formData.postalCode
      });
      console.log('🔍 Selected images:', selectedImages);
      console.log('🔍 User ID:', user?.id);

      // Prepare registration data
      const registrationData: HospitalRegistration = {
        ...formData,
        userId: user?.id || '',
      };

      console.log('🔍 Registration data prepared:', registrationData);

      // Submit to backend
      const response = await hospitalService.registerHospital(registrationData, selectedImages);

      console.log('🔍 Backend response:', response);

      if (response.success) {
        Alert.alert(
          'Registration Successful!',
          'Your hospital registration has been submitted successfully. We will review your application and contact you within 3-5 business days.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', response.message || 'Failed to submit registration. Please try again.');
      }
    } catch (error) {
      console.error('❌ Hospital registration error:', error);
      Alert.alert('Error', 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <LinearGradient
        colors={[ACCENT, '#2980b9']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hospital Registration</Text>
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
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.hospitalName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, hospitalName: text }))}
              placeholder="Enter hospital name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Administrator Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.administratorName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, administratorName: text }))}
              placeholder="Enter administrator's full name"
            />
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isGettingLocation}
          >
            <FontAwesome 
              name={isGettingLocation ? "spinner" : "location-arrow"} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.locationButtonText}>
              {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>
          

          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
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
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
              placeholder="Enter city"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Region/State</Text>
            <TextInput
              style={styles.input}
              value={formData.region}
              onChangeText={(text) => setFormData(prev => ({ ...prev, region: text }))}
              placeholder="Enter region or state"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postal Code</Text>
            <TextInput
              style={styles.input}
              value={formData.postalCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, postalCode: text }))}
              placeholder="Enter postal code"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesNote}>
              Coordinates help with Google Maps integration. You can edit these values if needed.
            </Text>
            <Text style={[styles.coordinatesNote, { fontSize: 12, color: TEXT_SECONDARY, marginTop: 5 }]}>
              💡 For International Maritime Hospital, approximate coordinates: 5.6037, -0.0169
            </Text>
            <View style={styles.coordinateInput}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={formData.latitude}
                onChangeText={(text) => setFormData(prev => ({ ...prev, latitude: text }))}
                placeholder="e.g., 5.6037"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.coordinateInput}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={formData.longitude}
                onChangeText={(text) => setFormData(prev => ({ ...prev, longitude: text }))}
                placeholder="e.g., -0.0169"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, licenseNumber: text }))}
              placeholder="Enter hospital license number"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration Number</Text>
            <TextInput
              style={styles.input}
              value={formData.registrationNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, registrationNumber: text }))}
              placeholder="Enter business registration number"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Specialties</Text>
          
          <View style={styles.specialtiesContainer}>
            {availableSpecialties.map((specialty) => (
              <TouchableOpacity
                key={specialty}
                style={[
                  styles.specialtyChip,
                  formData.specialties.includes(specialty) && styles.specialtyChipSelected
                ]}
                onPress={() => toggleSpecialty(specialty)}
              >
                <Text style={[
                  styles.specialtyChipText,
                  formData.specialties.includes(specialty) && styles.specialtyChipTextSelected
                ]}>
                  {specialty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facilities & Services</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bed Capacity</Text>
            <TextInput
              style={styles.input}
              value={formData.bedCapacity}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bedCapacity: text }))}
              placeholder="Enter number of beds"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Emergency Department</Text>
              <Switch
                value={formData.hasEmergency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasEmergency: value }))}
                trackColor={{ false: '#ecf0f1', true: ACCENT }}
                thumbColor={formData.hasEmergency ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>ICU/CCU</Text>
              <Switch
                value={formData.hasICU}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasICU: value }))}
                trackColor={{ false: '#ecf0f1', true: ACCENT }}
                thumbColor={formData.hasICU ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Ambulance Service</Text>
              <Switch
                value={formData.hasAmbulance}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasAmbulance: value }))}
                trackColor={{ false: '#ecf0f1', true: ACCENT }}
                thumbColor={formData.hasAmbulance ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Accepts Insurance</Text>
              <Switch
                value={formData.acceptsInsurance}
                onValueChange={(value) => setFormData(prev => ({ ...prev, acceptsInsurance: value }))}
                trackColor={{ false: '#ecf0f1', true: ACCENT }}
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
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Tell us about your hospital..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hospital Images</Text>
          <Text style={styles.sectionSubtitle}>Upload photos of your hospital (optional)</Text>
          
          <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
            <FontAwesome name="camera" size={24} color={ACCENT} />
            <Text style={styles.imageUploadText}>Add Images</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewTitle}>Selected Images ({selectedImages.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedImages.map((imageUri, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <FontAwesome name="times" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
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
    backgroundColor: ACCENT,
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
  inputGroup: {
    marginBottom: 16,
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
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  specialtyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  specialtyChipText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  specialtyChipTextSelected: {
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
    backgroundColor: ACCENT,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(52, 152, 219, 0.6)',
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  imageUploadText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '500',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    marginTop: 16,
  },
  imagePreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 12,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: DANGER,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  coordinateInput: {
    flex: 0.48,
  },
  coordinatesNote: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 12,
    fontStyle: 'italic',
  },
}); 