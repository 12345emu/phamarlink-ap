import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

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
      console.log('🔍 HospitalService - Images:', images);

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

      // Add images if provided
      if (images && images.length > 0) {
        images.forEach((imageUri, index) => {
          // Create a file object from the image URI
          const imageFile = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `hospital-image-${index}.jpg`
          } as any;
          formData.append('images', imageFile);
        });
      }

      console.log('🔍 HospitalService - FormData created, sending request...');
      console.log('🔍 HospitalService - API endpoint:', `${API_ENDPOINTS.FACILITIES.LIST}/hospital/register`);

      const response = await apiClient.post<any>(`${API_ENDPOINTS.FACILITIES.LIST}/hospital/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('🔍 HospitalService - Response received:', response);
      return response;
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
