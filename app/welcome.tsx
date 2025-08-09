import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, StatusBar, TouchableWithoutFeedback, Keyboard, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { markUserAsNotFirstTime, clearAllData } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation for first-time users
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = () => {
    markUserAsNotFirstTime(); // Mark user as not first time
    router.push('/login');
  };

  const handleSignup = () => {
    markUserAsNotFirstTime(); // Mark user as not first time
    router.push('/signup');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#4facfe', '#00f2fe']}
        style={styles.backgroundGradient}
      />
      
      {/* Content Container */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Logo and App Name */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <FontAwesome name="heartbeat" size={60} color="#fff" />
            </View>
            <Text style={styles.appName}>PharmaLink</Text>
            <Text style={styles.appTagline}>Your Health, Our Priority</Text>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <FontAwesome name="medkit" size={24} color="#fff" />
              <Text style={styles.featureText}>Order Medicines</Text>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome name="hospital-o" size={24} color="#fff" />
              <Text style={styles.featureText}>Book Appointments</Text>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome name="map-marker" size={24} color="#fff" />
              <Text style={styles.featureText}>Find Nearby Pharmacies</Text>
            </View>
            <View style={styles.featureItem}>
              <FontAwesome name="comments" size={24} color="#fff" />
              <Text style={styles.featureText}>Chat with Professionals</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSignup}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLogin}
              activeOpacity={0.7}
            >
              <View style={styles.secondaryButtonContent}>
                <FontAwesome name="user" size={16} color="#fff" style={styles.secondaryButtonIcon} />
                <Text style={styles.secondaryButtonText}>I already have an account</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Test Button - Remove this in production */}
          <TouchableOpacity 
            style={styles.testButton}
            onPress={async () => {
              await clearAllData();
              router.replace('/');
            }}
          >
            <Text style={styles.testButtonText}>🧪 Test: Reset App State</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: height * 0.1,
    paddingBottom: height * 0.05,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: height * 0.05,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    fontWeight: '500',
  },
  featuresSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 15,
    fontWeight: '600',
  },
  actionSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonIcon: {
    marginRight: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 5,
  },
  termsLink: {
    fontSize: 14,
    color: '#fff',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
}); 