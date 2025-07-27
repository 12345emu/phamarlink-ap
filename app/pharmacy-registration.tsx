import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, TextInput, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const BACKGROUND = '#f8f9fa';
const DANGER = '#e74c3c';

interface PharmacyRegistration {
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  licenseNumber: string;
  registrationNumber: string;
  services: string[];
  operatingHours: string;
  emergencyContact: string;
  description: string;
  acceptsInsurance: boolean;
  hasDelivery: boolean;
  hasConsultation: boolean;
}

export default function PharmacyRegistrationScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PharmacyRegistration>({
    pharmacyName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    licenseNumber: '',
    registrationNumber: '',
    services: [],
    operatingHours: '',
    emergencyContact: '',
    description: '',
    acceptsInsurance: false,
    hasDelivery: false,
    hasConsultation: false,
  });

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
    'Online Prescriptions'
  ];

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
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
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter license number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Registration Successful!',
        'Your pharmacy registration has been submitted successfully. We will review your application and contact you within 3-5 business days.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
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
}); 