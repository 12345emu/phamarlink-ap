import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { constructProfileImageUrl } from '../utils/imageUtils';

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
  role: 'patient' | 'doctor' | 'pharmacist' | 'admin';
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
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNUP, userData);
      
      if (response.success && response.data) {
        // Store tokens and user data
        await this.storeAuthData(response.data);
      }
      
      return response;
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'Signup failed. Please try again.',
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
      
      // Create form data
      const formData = new FormData();
      formData.append('profileImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile-image.jpg'
      } as any);
      
      const response = await apiClient.post<{ profileImage: string }>(
        API_ENDPOINTS.AUTH.UPLOAD_PROFILE_IMAGE,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('🔍 AuthService - Upload response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      
      return response;
    } catch (error) {
      console.error('❌ AuthService - Upload profile image error:', error);
      return {
        success: false,
        message: 'Failed to upload profile image',
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
      return await apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordData);
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
}

// Export singleton instance
export const authService = new AuthService();

 