import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { authService } from '../services/authService';

const { height } = Dimensions.get('window');

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Start countdown timer
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d$/.test(value) && value !== '') {
      return; // Only allow digits
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email not found. Please start over.');
      router.replace('/forgot-password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.verifyOTP(email, otpCode);

      if (response.success && response.data?.verificationToken) {
        // Navigate to reset password screen with verification token
        router.replace({
          pathname: '/reset-password',
          params: {
            verificationToken: response.data.verificationToken,
            email: email,
          },
        });
      } else {
        Alert.alert('Error', response.message || 'Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error);
      Alert.alert('Error', error?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Email not found. Please start over.');
      router.replace('/forgot-password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      if (response.success) {
        Alert.alert('Success', 'A new OTP has been sent to your email');
        setOtp(['', '', '', '', '', '']);
        setTimer(600); // Reset timer
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', response.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Resend OTP error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <LinearGradient
        colors={['#4facfe', '#00f2fe']}
        style={styles.backgroundGradient}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
        <View style={styles.placeholder} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <FontAwesome name="key" size={40} color="#fff" />
            </View>
            <Text style={styles.appName}>PharmaLink</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Enter Verification Code</Text>
            <Text style={styles.formSubtitle}>
              We've sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>

            {/* OTP Input Boxes */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isLoading}
                />
              ))}
            </View>

            {/* Timer */}
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Code expires in: <Text style={styles.timerValue}>{formatTime(timer)}</Text>
              </Text>
            ) : (
              <Text style={styles.expiredText}>OTP has expired</Text>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, (isLoading || otp.join('').length !== 6 || timer === 0) && styles.verifyButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isLoading || otp.join('').length !== 6 || timer === 0}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend OTP */}
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.resendButtonText}>
                Didn't receive the code? <Text style={styles.resendLink}>Resend OTP</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '600',
    color: '#3498db',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  otpInputFilled: {
    borderColor: '#667eea',
    backgroundColor: '#fff',
  },
  timerText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerValue: {
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  expiredText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  verifyButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  resendLink: {
    color: '#3498db',
    fontWeight: '600',
  },
});

