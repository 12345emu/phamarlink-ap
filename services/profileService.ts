import { apiClient } from './apiClient';
import { API_ENDPOINTS, API_CONFIG } from '../constants/API';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    user?: any;
    patientProfile?: any;
    profileImage?: string;
  };
}

/**
 * Update user profile information
 * @param profileData - The profile data to update
 * @returns Promise with update result
 */
export const updateUserProfile = async (profileData: ProfileUpdateData): Promise<ProfileUpdateResponse> => {
  try {
    console.log('🔍 ProfileService - Updating user profile:', profileData);
    console.log('🔍 ProfileService - API endpoint:', API_ENDPOINTS.AUTH.PROFILE);
    console.log('🔍 ProfileService - Full URL:', `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.PROFILE}`);
    
    const response = await apiClient.put(API_ENDPOINTS.AUTH.PROFILE, profileData);
    
    console.log('✅ ProfileService - Profile update response:', response);
    console.log('✅ ProfileService - Response data:', response.data);
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ ProfileService - Profile update error:', error);
    console.error('❌ ProfileService - Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update profile',
      data: error.response?.data
    };
  }
};

/**
 * Upload profile image
 * @param imageUri - The local image URI
 * @returns Promise with upload result
 */
export const uploadProfileImage = async (imageUri: string): Promise<ProfileUpdateResponse> => {
  try {
    console.log('🔍 ProfileService - Uploading profile image:', imageUri);
    console.log('🔍 ProfileService - API endpoint:', API_ENDPOINTS.AUTH.UPLOAD_PROFILE_IMAGE);
    console.log('🔍 ProfileService - Full URL:', `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.UPLOAD_PROFILE_IMAGE}`);
    
    // Create FormData for file upload with proper React Native format
    const formData = new FormData();
    formData.append('profileImage', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
    
    console.log('🔍 ProfileService - FormData created:', formData);
    console.log('🔍 ProfileService - About to make API call...');
    
    // Get auth token for the request
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Use direct axios call to avoid Content-Type override from apiClient
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.UPLOAD_PROFILE_IMAGE}`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Don't set Content-Type - let axios set it automatically for FormData
        },
        timeout: 30000, // 30 seconds timeout for image uploads
      }
    );
    
    console.log('✅ ProfileService - Image upload response:', response);
    console.log('✅ ProfileService - Response data:', response.data);
    
    return {
      success: true,
      message: 'Profile image uploaded successfully',
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ ProfileService - Image upload error:', error);
    console.error('❌ ProfileService - Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to upload profile image',
      data: error.response?.data
    };
  }
};
