import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS, API_CONFIG } from '../constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { constructProfileImageUrl } from '../utils/imageUtils';
import axios from 'axios';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin' | 'facility-admin';
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  role: 'patient' | 'doctor' | 'pharmacist';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Authentication Service
class AuthService {
  // User login
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('🔍 AuthService - Starting login for:', credentials.email);
      console.log('🔍 AuthService - Full credentials object:', credentials);
      console.log('🔍 AuthService - Email in credentials:', `"${credentials.email}"`);
      console.log('🔍 AuthService - Password in credentials:', `"${credentials.password}"`);
      console.log('🔍 AuthService - API endpoint:', API_ENDPOINTS.AUTH.LOGIN);
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
      
      console.log('🔍 AuthService - API response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      
      if (response.success && response.data) {
        console.log('🔍 AuthService - Login successful, storing auth data...');
        console.log('🔍 AuthService - Token preview:', response.data.token ? `${response.data.token.substring(0, 20)}...` : 'No token');
        console.log('🔍 AuthService - User data:', {
          id: response.data.user.id,
          email: response.data.user.email,
          role: response.data.user.role
        });
        
        // Store tokens and user data
        await this.storeAuthData(response.data);
        console.log('🔍 AuthService - Auth data stored successfully');
      } else {
        console.error('❌ AuthService - Login failed:', response.message);
      }
      
      return response;
    } catch (error) {
      console.error('❌ AuthService - Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.',
        error: 'Login Error',
      };
    }
  }

  // User signup
  async signup(userData: SignupData): Promise<ApiResponse<AuthResponse>> {
    try {
      // Transform role to userType for backend compatibility
      const { role, ...restData } = userData;
      const requestData = {
        ...restData,
        userType: role
      };
      
      console.log('🔍 AuthService - Signup request data:', {
        ...requestData,
        password: '***'
      });
      
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNUP, requestData);
      
      console.log('🔍 AuthService - Signup response:', {
        success: response.success,
        message: response.message,
        hasData: !!response.data
      });
      
      // If there are validation errors in the response, format them
      if (!response.success && (response as any).errors) {
        const validationErrors = (response as any).errors.map((err: any) => err.msg || err.message || err.param).join(', ');
        return {
          ...response,
          message: validationErrors ? `Validation failed: ${validationErrors}` : response.message
        };
      }
      
      if (response.success && response.data) {
        // Store tokens and user data
        await this.storeAuthData(response.data);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      console.error('❌ Signup error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      // If there are validation errors from the backend, include them in the message
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors.map((err: any) => err.msg || err.message).join(', ');
        return {
          success: false,
          message: `Validation failed: ${validationErrors}`,
          error: 'Validation Error',
        };
      }
      
      return {
        success: false,
        message: error?.response?.data?.message || 'Signup failed. Please try again.',
        error: 'Signup Error',
      };
    }
  }

  // Get user profile
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      return await apiClient.get<User>(API_ENDPOINTS.AUTH.PROFILE);
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: 'Failed to get profile. Please try again.',
        error: 'Profile Error',
      };
    }
  }

  // Upload profile image
  async uploadProfileImage(imageUri: string): Promise<ApiResponse<{ profileImage: string }>> {
    try {
      console.log('🔍 AuthService - Uploading profile image...');
      console.log('🔍 AuthService - Image URI:', imageUri);
      
      // Validate image URI
      if (!imageUri || typeof imageUri !== 'string') {
        throw new Error('Invalid image URI provided');
      }
      
      // Create form data with explicit file object for React Native
      const formData = new FormData();
      
      // Create a proper file object for React Native
      const file = {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile-image-${Date.now()}.jpg`
      };
      
      // Append the file to FormData (React Native specific approach)
      // Try multiple field names to ensure compatibility
      formData.append('profileImage', file as any);
      formData.append('image', file as any);
      formData.append('file', file as any);
      
      console.log('🔍 AuthService - FormData created with file:', {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
      
      // Debug FormData contents
      console.log('🔍 AuthService - FormData entries:');
      try {
        for (const [key, value] of formData.entries()) {
          console.log(`  ${key}:`, typeof value, value);
        }
      } catch (error) {
        console.log('⚠️ Could not iterate FormData entries:', error);
      }
      
      console.log('🔍 AuthService - FormData created, sending request...');
      
      // Try direct axios call instead of apiClient for FormData
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔍 AuthService - Making direct axios request with FormData');
      
      try {
        const response = await axios.post(
          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.UPLOAD_PROFILE_IMAGE}`,
          formData,
          {
            timeout: 30000,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              // Don't set Content-Type - let axios handle it for FormData
            }
          }
        );

        // Convert axios response to our ApiResponse format
        const apiResponse: ApiResponse<{ profileImage: string }> = {
          success: response.data.success,
          data: response.data.data,
          message: response.data.message,
          error: response.data.error
        };
        
        return apiResponse;
      } catch (axiosError: any) {
        console.log('⚠️ Direct axios call failed, trying apiClient fallback');
        
        // Fallback to apiClient
        const fallbackResponse = await apiClient.post<{ profileImage: string }>(
          API_ENDPOINTS.AUTH.UPLOAD_PROFILE_IMAGE,
          formData,
          {
            timeout: 30000,
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        return fallbackResponse;
      }
    } catch (error: any) {
      console.error('❌ AuthService - Upload profile image error:', error);
      
      // Handle specific error types
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection and try again.',
          error: 'Network Error',
        };
      } else if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
        return {
          success: false,
          message: 'Upload timeout. The image might be too large. Please try a smaller image.',
          error: 'Timeout Error',
        };
      } else if (error.response?.status === 413) {
        return {
          success: false,
          message: 'Image file is too large. Please select a smaller image (max 5MB).',
          error: 'File Too Large',
        };
      } else if (error.response?.status === 415) {
        return {
          success: false,
          message: 'Invalid image format. Please select a JPEG or PNG image.',
          error: 'Invalid Format',
        };
      } else if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Authentication required. Please log in again.',
          error: 'Authentication Error',
        };
      }
      
      return {
        success: false,
        message: error.message || 'Failed to upload profile image. Please try again.',
        error: 'Upload Error',
      };
    }
  }

  // Update patient profile
  async updatePatientProfile(profileData: {
    emergency_contact?: string;
    insurance_provider?: string;
    insurance_number?: string;
    blood_type?: string;
    allergies?: string;
    medical_history?: string;
  }): Promise<ApiResponse<{ patientProfile: any }>> {
    try {
      console.log('🔍 AuthService - Updating patient profile...');
      
      const response = await apiClient.put<{ patientProfile: any }>(
        API_ENDPOINTS.AUTH.UPDATE_PATIENT_PROFILE,
        profileData
      );
      
      console.log('🔍 AuthService - Patient profile update response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      
      return response;
    } catch (error) {
      console.error('❌ AuthService - Update patient profile error:', error);
      return {
        success: false,
        message: 'Failed to update patient profile',
        error: 'Patient Profile Update Error',
      };
    }
  }

  // Update user profile
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      console.log('🔍 AuthService - Updating profile with data:', profileData);
      const response = await apiClient.put<User>(API_ENDPOINTS.AUTH.PROFILE, profileData);
      console.log('🔍 AuthService - Profile update response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Failed to update profile. Please try again.',
        error: 'Profile Update Error',
      };
    }
  }

  // Change password
  async changePassword(passwordData: ChangePasswordData): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.put<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordData);
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Failed to change password. Please try again.',
        error: 'Password Change Error',
      };
    }
  }

  // Refresh token
  async refreshToken(): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      return await apiClient.post<{ token: string; refreshToken: string }>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refreshToken,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        message: 'Failed to refresh token. Please try again.',
        error: 'Token Refresh Error',
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage regardless of API call success
      await this.clearAuthData();
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token;
    } catch (error) {
      console.error('Check auth error:', error);
      return false;
    }
  }

  // Get stored user data
  async getStoredUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get stored user data error:', error);
      return null;
    }
  }

  // Store authentication data
  private async storeAuthData(authData: AuthResponse): Promise<void> {
    try {
      console.log('🔍 AuthService - Storing auth data in AsyncStorage...');
      console.log('🔍 AuthService - Token to store:', authData.token ? `${authData.token.substring(0, 20)}...` : 'No token');
      console.log('🔍 AuthService - Refresh token to store:', authData.refreshToken ? `${authData.refreshToken.substring(0, 20)}...` : 'No refresh token');
      console.log('🔍 AuthService - User data to store:', {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.role
      });
      
      // Construct full URL for profile image if it exists
      const userDataToStore = { ...authData.user };
      if (userDataToStore.profileImage) {
        userDataToStore.profileImage = constructProfileImageUrl(userDataToStore.profileImage);
        console.log('🔍 AuthService - Constructed full profile image URL:', userDataToStore.profileImage);
      }
      
      await AsyncStorage.multiSet([
        ['userToken', authData.token],
        ['refreshToken', authData.refreshToken],
        ['userData', JSON.stringify(userDataToStore)],
      ]);
      
      console.log('🔍 AuthService - Auth data stored successfully in AsyncStorage');
      
      // Verify storage
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      console.log('🔍 AuthService - Verification - Stored token:', storedToken ? `${storedToken.substring(0, 20)}...` : 'No token found');
      console.log('🔍 AuthService - Verification - Stored user data:', storedUserData ? 'exists' : 'not found');
      
    } catch (error) {
      console.error('❌ AuthService - Store auth data error:', error);
      throw error;
    }
  }

  // Clear authentication data
  private async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
    } catch (error) {
      console.error('Clear auth data error:', error);
    }
  }

  // Validate email format
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate phone number
  validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  // Forgot password - request OTP
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('🔍 AuthService - Requesting password reset OTP for:', email);
      console.log('🔍 AuthService - API Base URL:', API_CONFIG.BASE_URL);
      console.log('🔍 AuthService - Full URL will be:', `${API_CONFIG.BASE_URL}/auth/forgot-password`);
      
      // Use longer timeout for email sending (30 seconds)
      const response = await apiClient.post<{ message: string }>(
        '/auth/forgot-password', 
        { email },
        { timeout: 30000 } // 30 seconds timeout
      );
      
      console.log('🔍 AuthService - Forgot password response:', {
        success: response.success,
        message: response.message,
        hasData: !!response.data
      });
      
      return response;
    } catch (error: any) {
      console.error('❌ AuthService - Forgot password error:', error);
      console.error('❌ AuthService - Error type:', error?.constructor?.name);
      console.error('❌ AuthService - Error message:', error?.message);
      console.error('❌ AuthService - Error code:', error?.code);
      console.error('❌ AuthService - Error response:', error?.response?.data);
      console.error('❌ AuthService - Error request:', error?.request ? 'Request made but no response' : 'No request made');
      
      // Check for network errors
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        return {
          success: false,
          message: 'Request timeout. The server is taking too long to respond. Please try again.',
          error: 'Timeout Error',
        };
      }
      
      if (!error?.response && error?.request) {
        return {
          success: false,
          message: `Network error. Unable to connect to server at ${API_CONFIG.BASE_URL}. Please check:\n\n• Backend server is running\n• Your internet connection\n• Server IP address is correct`,
          error: 'Network Error',
        };
      }
      
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Failed to send OTP. Please try again.',
        error: 'Forgot Password Error',
      };
    }
  }

  // Verify OTP
  async verifyOTP(email: string, otp: string): Promise<ApiResponse<{ verificationToken: string }>> {
    try {
      console.log('🔍 AuthService - Verifying OTP for:', email);
      const response = await apiClient.post<{ verificationToken: string }>('/auth/verify-otp', {
        email,
        otp,
      });
      console.log('🔍 AuthService - Verify OTP response:', {
        success: response.success,
        hasToken: !!response.data?.verificationToken
      });
      return response;
    } catch (error: any) {
      console.error('❌ AuthService - Verify OTP error:', error);
      return {
        success: false,
        message: error?.response?.data?.message || 'Invalid or expired OTP. Please try again.',
        error: 'Verify OTP Error',
      };
    }
  }

  // Reset password - set new password with verification token
  async resetPassword(verificationToken: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('🔍 AuthService - Resetting password with verification token');
      const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
        verificationToken,
        newPassword,
      });
      console.log('🔍 AuthService - Reset password response:', {
        success: response.success,
        message: response.message
      });
      return response;
    } catch (error: any) {
      console.error('❌ AuthService - Reset password error:', error);
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to reset password. Please try again.',
        error: 'Reset Password Error',
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

 