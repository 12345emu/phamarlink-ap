import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, TextInput, Alert, Switch, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { pharmacyService, PharmacyRegistrationData } from '../services/pharmacyService';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const BACKGROUND = '#f8f9fa';
const DANGER = '#e74c3c';

// Google Maps API Key (same as hospital registration)
const GOOGLE_MAPS_API_KEY = 'AIzaSyBsCGBtOteigRK5_Uld_yKuUyoEjCKGWyg';

interface PharmacyRegistration {
  pharmacyName: string;
  ownerName: string;
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
  services: string[];
  operatingHours: string;
  emergencyContact: string;
  description: string;
  acceptsInsurance: boolean;
  hasDelivery: boolean;
  hasConsultation: boolean;
  userId?: string;
  images: string[]; // Array of image URIs
}

export default function PharmacyRegistrationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [formData, setFormData] = useState<PharmacyRegistration>({
    pharmacyName: '',
    ownerName: '',
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
    services: [],
    operatingHours: '',
    emergencyContact: '',
    description: '',
    acceptsInsurance: false,
    hasDelivery: false,
    hasConsultation: false,
    images: [],
  });
  
  // Debug logging
  console.log('PharmacyRegistrationScreen render - latitude:', formData.latitude, 'longitude:', formData.longitude);
  
  // Monitor formData changes
  useEffect(() => {
    console.log('formData changed - latitude:', formData.latitude, 'longitude:', formData.longitude);
  }, [formData.latitude, formData.longitude]);

  const availableServices = [
    'Prescription Dispensing',
    'Over-the-Counter Medications',
    'Health Consultations',
    'Vaccinations',
    'Health Screenings',
    'Medical Equipment',
    'Compounding',
    'Emergency Services',
    'Home Delivery',
    'Online Prescriptions',
    'Staff Consultation',
    '24/7 Emergency Services'
  ];

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
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
      console.log('getCurrentLocation called (pharmacy)');
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get your current location.');
        return;
      }

      // Enable location services for better accuracy
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'Location Services Disabled', 
          'Please enable location services in your device settings for accurate location detection.'
        );
        return;
      }

      // Get current position with maximum accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // 10 seconds timeout
        distanceInterval: 1, // Update every 1 meter
      });

      console.log('🔍 Location obtained:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed
      });
      
      // Validate location accuracy
      if (location.coords.accuracy && location.coords.accuracy > 50) {
        console.warn('Location accuracy is low:', location.coords.accuracy, 'meters');
        Alert.alert(
          'Low Accuracy Warning', 
          'Your location accuracy is low. Please ensure you have a clear view of the sky and try again for better results.'
        );
      }

      // Try Google Maps API first for more accurate location
      let googleLocationData = null;
      if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 20) {
        console.log('🔍 Trying Google Maps API for precise location...');
        googleLocationData = await getLocationFromGoogleMaps(
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('🔍 Google Maps location data:', googleLocationData);
      }

      // Fallback to Expo Location reverse geocoding
      let addressResponse;
      try {
        addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('🔍 Expo Location address response:', addressResponse);
        console.log('🔍 Address response length:', addressResponse.length);
      } catch (geocodeError) {
        console.log('❌ Reverse geocoding failed:', geocodeError);
        addressResponse = [];
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
        const addressInfo = addressResponse[0] || {};
        console.log('🔍 Raw Expo Location address data:', addressInfo);
        
        // Try different property names for address components
        finalAddress = (addressInfo as any).street || (addressInfo as any).name || (addressInfo as any).thoroughfare || '';
        finalCity = (addressInfo as any).city || (addressInfo as any).subregion || (addressInfo as any).locality || '';
        finalRegion = (addressInfo as any).region || (addressInfo as any).administrativeArea || '';
        
        // Try multiple property names for postal code
        finalPostalCode = (addressInfo as any).postalCode || 
                         (addressInfo as any).postal || 
                         (addressInfo as any).postcode || 
                         (addressInfo as any).zipCode || 
                         (addressInfo as any).zip || 
                         '';
        
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

      // Debug: Show what we extracted
      console.log('Final address components:', {
        finalAddress,
        finalCity,
        finalRegion,
        postalCode: finalPostalCode
      });

      // Update form data with real location (high precision coordinates)
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
        console.log('Updated formData with high-precision coordinates and address:', {
          latitude: newData.latitude,
          longitude: newData.longitude,
          accuracy: location.coords.accuracy,
          address: newData.address,
          city: newData.city,
          region: newData.region,
          postalCode: newData.postalCode
        });
        return newData;
      });
      
      // Force a small delay to ensure form updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Location updated successfully with real coordinates (pharmacy)');
      
      // Success alert with accuracy information
      const accuracyText = location.coords.accuracy ? 
        `\nAccuracy: ±${Math.round(location.coords.accuracy)} meters` : 
        '\nAccuracy: High precision';
      
      // Add location quality indicator
      let qualityIndicator = '';
      if (location.coords.accuracy) {
        if (location.coords.accuracy <= 5) {
          qualityIndicator = '\n✅ Location Quality: Excellent';
        } else if (location.coords.accuracy <= 20) {
          qualityIndicator = '\n✅ Location Quality: Good';
        } else if (location.coords.accuracy <= 100) {
          qualityIndicator = '\n⚠️ Location Quality: Fair';
        } else {
          qualityIndicator = '\n⚠️ Location Quality: Poor - Consider moving to a better location';
        }
      }
      
      Alert.alert(
        'Location Updated Successfully!', 
        `Your exact current location has been captured!\n\nAddress: ${finalAddress}\nCity: ${finalCity}\nRegion: ${finalRegion}\nPostal Code: ${finalPostalCode}${accuracyText}\n\nCoordinates: ${location.coords.latitude.toFixed(8)}, ${location.coords.longitude.toFixed(8)}${qualityIndicator}`
      );
      
    } catch (error) {
      console.log('Error in getCurrentLocation (pharmacy):', error);
      Alert.alert('Error', 'Could not get your current location. Please try again or enter manually.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages].slice(0, 5) // Limit to 5 images
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.pharmacyName.trim()) {
      Alert.alert('Error', 'Please enter pharmacy name');
      return;
    }
    if (!formData.ownerName.trim()) {
      Alert.alert('Error', 'Please enter owner name');
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
    
    // Validate phone number format (Ghana format)
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      Alert.alert('Error', 'Please enter a valid Ghana phone number (e.g., +233501234567 or 0501234567)');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return;
    }
    if (formData.address.trim().length < 5) {
      Alert.alert('Error', 'Address must be at least 5 characters long');
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
    
    // Validate emergency contact format if provided
    if (formData.emergencyContact && formData.emergencyContact.trim()) {
      const emergencyPhoneRegex = /^(\+233|0)[0-9]{9}$/;
      if (!emergencyPhoneRegex.test(formData.emergencyContact.trim())) {
        Alert.alert('Error', 'Please enter a valid Ghana emergency contact number (e.g., +233501234567 or 0501234567)');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      console.log('🔍 Submitting pharmacy registration...');
      
      // Prepare data for API
      const registrationData: PharmacyRegistrationData = {
        pharmacyName: formData.pharmacyName,
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        region: formData.region || undefined,
        postalCode: formData.postalCode || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        licenseNumber: formData.licenseNumber,
        registrationNumber: formData.registrationNumber || undefined,
        services: formData.services.length > 0 ? formData.services : undefined,
        operatingHours: formData.operatingHours || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        description: formData.description || undefined,
        acceptsInsurance: formData.acceptsInsurance,
        hasDelivery: formData.hasDelivery,
        hasConsultation: formData.hasConsultation,
        userId: user ? user.id : undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
      };

      console.log('🔍 Registration data being sent:', registrationData);
      
      // Call the API
      const response = await pharmacyService.registerPharmacy(registrationData);
      
      if (response.success) {
        Alert.alert(
          'Registration Successful!',
          response.message || 'Your pharmacy registration has been submitted successfully. We will review your application and contact you within 3-5 business days.',
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
      console.error('❌ Registration error:', error);
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
        colors={[SUCCESS, '#2ecc71']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacy Registration</Text>
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
            <Text style={styles.label}>Pharmacy Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.pharmacyName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, pharmacyName: text }))}
              placeholder="Enter pharmacy name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Owner Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.ownerName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, ownerName: text }))}
              placeholder="Enter owner's full name"
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
            <Text style={[styles.coordinatesNote, { fontSize: 12, color: '#7f8c8d', marginTop: 5 }]}>
              💡 For International Maritime Pharmacy, approximate coordinates: 5.6037, -0.0169
            </Text>
            <View style={styles.coordinateInput}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={formData.latitude}
                onChangeText={(text) => setFormData(prev => ({ ...prev, latitude: text }))}
                placeholder="e.g., 5.5600"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.coordinateInput}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={formData.longitude}
                onChangeText={(text) => setFormData(prev => ({ ...prev, longitude: text }))}
                placeholder="e.g., -0.2057"
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
              placeholder="Enter pharmacy license number"
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
          <Text style={styles.sectionTitle}>Services & Features</Text>
          
          <View style={styles.servicesContainer}>
            {availableServices.map((service) => (
              <TouchableOpacity
                key={service}
                style={[
                  styles.serviceChip,
                  formData.services.includes(service) && styles.serviceChipSelected
                ]}
                onPress={() => toggleService(service)}
              >
                <Text style={[
                  styles.serviceChipText,
                  formData.services.includes(service) && styles.serviceChipTextSelected
                ]}>
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Accepts Insurance</Text>
              <Switch
                value={formData.acceptsInsurance}
                onValueChange={(value) => setFormData(prev => ({ ...prev, acceptsInsurance: value }))}
                trackColor={{ false: '#ecf0f1', true: SUCCESS }}
                thumbColor={formData.acceptsInsurance ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Home Delivery</Text>
              <Switch
                value={formData.hasDelivery}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasDelivery: value }))}
                trackColor={{ false: '#ecf0f1', true: SUCCESS }}
                thumbColor={formData.hasDelivery ? '#fff' : '#bdc3c7'}
              />
            </View>

            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Health Consultations</Text>
              <Switch
                value={formData.hasConsultation}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hasConsultation: value }))}
                trackColor={{ false: '#ecf0f1', true: SUCCESS }}
                thumbColor={formData.hasConsultation ? '#fff' : '#bdc3c7'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Operating Hours</Text>
            <TextInput
              style={styles.input}
              value={formData.operatingHours}
              onChangeText={(text) => setFormData(prev => ({ ...prev, operatingHours: text }))}
              placeholder="e.g., Mon-Fri: 8AM-8PM, Sat: 9AM-6PM"
            />
          </View>

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
              placeholder="Tell us about your pharmacy..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pharmacy Images</Text>
          <Text style={styles.sectionSubtitle}>
            Upload photos of your pharmacy (up to 5 images). This helps customers identify your location.
          </Text>
          
          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={pickImage}
            disabled={formData.images.length >= 5}
          >
            <FontAwesome name="camera" size={24} color={ACCENT} />
            <Text style={styles.imageUploadButtonText}>
              {formData.images.length >= 5 ? 'Maximum images reached' : 'Add Photos'}
            </Text>
            <Text style={styles.imageUploadButtonSubtext}>
              {formData.images.length}/5 images
            </Text>
          </TouchableOpacity>

          {formData.images.length > 0 && (
            <View style={styles.imagesContainer}>
              {formData.images.map((imageUri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <FontAwesome name="times" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
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
    backgroundColor: SUCCESS,
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
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  serviceChipSelected: {
    backgroundColor: SUCCESS,
    borderColor: SUCCESS,
  },
  serviceChipText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  serviceChipTextSelected: {
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
    backgroundColor: SUCCESS,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(67, 233, 123, 0.6)',
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 20,
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  imageUploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginTop: 8,
  },
  imageUploadButtonSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 