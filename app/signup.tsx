import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

const userTypes = [
  { id: 'patient', label: 'Patient', icon: 'user', description: 'I need medical services', color: '#3498db' },
  { id: 'pharmacist', label: 'Pharmacist', icon: 'medkit', description: 'I provide pharmacy services', color: '#2ecc71' },
  { id: 'doctor', label: 'Doctor', icon: 'stethoscope', description: 'I provide medical care', color: '#e74c3c' },
  { id: 'pharmacy', label: 'Pharmacy', icon: 'plus-circle', description: 'I represent a pharmacy', color: '#9b59b6' },
  { id: 'hospital', label: 'Hospital', icon: 'hospital-o', description: 'I represent a hospital', color: '#f39c12' },
];

export default function SignupScreen() {
  const router = useRouter();

  const handleBackToWelcome = () => {
    router.push('/welcome');
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const navigateToRegistration = (userType: string) => {
    // Navigate to the appropriate registration form based on selected role
    switch (userType) {
      case 'patient':
        router.push('/patient-signup' as any);
        break;
      case 'pharmacist':
        router.push('/pharmacist-registration');
        break;
      case 'doctor':
        router.push('/doctor-registration');
        break;
      case 'pharmacy':
        router.push('/pharmacy-registration');
        break;
      case 'hospital':
        router.push('/hospital-registration');
        break;
      default:
        Alert.alert('Error', 'Invalid role selected');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackToWelcome}
          activeOpacity={0.7}
        >
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.logoGradient}
              >
                <FontAwesome name="heartbeat" size={48} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>PharmaLink</Text>
            <Text style={styles.appTagline}>Your Health, Our Priority</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Join PharmaLink Today</Text>
            
            {/* User Type Selection */}
            <Text style={styles.sectionTitle}>Select Your Role</Text>
            <Text style={styles.sectionSubtitle}>Choose the option that best describes you</Text>
            <View style={styles.userTypeContainer}>
              {userTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.userTypeOption}
                  onPress={() => navigateToRegistration(type.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.userTypeIcon, { backgroundColor: type.color }]}>
                    <FontAwesome 
                      name={type.icon as any} 
                      size={22} 
                      color="#fff" 
                    />
                  </View>
                  <View style={styles.userTypeInfo}>
                    <Text style={[styles.userTypeLabel, { color: type.color }]}>
                      {type.label}
                    </Text>
                    <Text style={styles.userTypeDescription}>
                      {type.description}
                    </Text>
                  </View>
                  <View style={[styles.checkCircle, { backgroundColor: type.color }]}>
                    <FontAwesome name="arrow-right" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleGoToLogin}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4facfe',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: height * 0.05,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    letterSpacing: 1,
  },
  appTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 12,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 6,
    marginTop: 24,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 16,
    fontWeight: '400',
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2.5,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userTypeOptionSelected: {
    backgroundColor: '#f8f9ff',
    borderWidth: 2.5,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  userTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userTypeIconSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userTypeInfo: {
    flex: 1,
  },
  userTypeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userTypeLabelSelected: {
    fontWeight: '800',
  },
  userTypeDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  userTypeDescriptionSelected: {
    color: '#5a6c7d',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButton: {
    height: 58,
    borderRadius: 29,
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loginLink: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
}); 