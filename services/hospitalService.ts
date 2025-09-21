import { apiClient } from './apiClient';
import { API_ENDPOINTS, API_CONFIG } from '../constants/API';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HospitalRegistration {
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
  images?: string[];
  userId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class HospitalService {
  // Register a new hospital
  async registerHospital(registrationData: HospitalRegistration, images?: string[]): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 HospitalService - Registering hospital with data:', registrationData);
      console.log('🔍 HospitalService - Images to upload:', images);

      // Create FormData for multipart/form-data
      const formData = new FormData();

      // Add text fields
      Object.keys(registrationData).forEach(key => {
        const value = registrationData[key as keyof HospitalRegistration];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // Handle arrays (specialties)
            value.forEach(item => {
              formData.append(key, item);
            });
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Add images if provided - React Native specific approach
      if (images && images.length > 0) {
        console.log('🔍 HospitalService - Processing images for upload...');
        images.forEach((imageUri, index) => {
          console.log(`🔍 HospitalService - Processing image ${index + 1}:`, imageUri);
          
          // Create proper file object for React Native
          // React Native FormData expects objects with uri, type, and name properties
          const imageFile = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `hospital-image-${Date.now()}-${index}.jpg`
          } as any;
          
          // For React Native, we need to append the file object directly
          // The network layer will handle the multipart encoding
          formData.append('images', imageFile);
          console.log(`✅ HospitalService - Image ${index + 1} added to FormData:`, {
            uri: imageFile.uri,
            type: imageFile.type,
            name: imageFile.name
          });
        });
      } else {
        console.log('⚠️ HospitalService - No images to upload');
      }

      console.log('🔍 HospitalService - FormData created, sending request...');
      console.log('🔍 HospitalService - API endpoint:', `${API_ENDPOINTS.FACILITIES.LIST}/hospital/register`);

      // Use direct axios for React Native FormData (more reliable)
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔍 HospitalService - Making direct axios request for React Native FormData');
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FACILITIES.LIST}/hospital/register`,
        formData,
        {
          timeout: 30000,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            // Don't set Content-Type - let React Native handle it
          }
        }
      );

      // Convert axios response to our ApiResponse format
      const apiResponse: ApiResponse<any> = {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error
      };

      console.log('🔍 HospitalService - Response received:', apiResponse);
      return apiResponse;
    } catch (error) {
      console.error('❌ HospitalService - Register hospital error:', error);

      if (error.response) {
        console.error('❌ HospitalService - Error response:', error.response.data);
        console.error('❌ HospitalService - Error status:', error.response.status);
      }

      return {
        success: false,
        message: 'Failed to register hospital. Please try again.',
        error: 'Hospital Registration Error',
      };
    }
  }

  // Get hospital by ID
  async getHospitalById(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>(`${API_ENDPOINTS.FACILITIES.GET_BY_ID(id)}`);
      return response;
    } catch (error) {
      console.error('Get hospital by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch hospital details. Please try again.',
        error: 'Get Hospital Error',
      };
    }
  }

  // Get all hospitals
  async getAllHospitals(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>(`${API_ENDPOINTS.FACILITIES.LIST}?type=hospital`);
      return response;
    } catch (error) {
      console.error('Get all hospitals error:', error);
      return {
        success: false,
        message: 'Failed to fetch hospitals. Please try again.',
        error: 'Get Hospitals Error',
      };
    }
  }
}

// Export singleton instance
export const hospitalService = new HospitalService();
