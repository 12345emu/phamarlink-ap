import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS, API_CONFIG } from '../constants/API';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface PharmacyRegistrationData {
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  licenseNumber: string;
  registrationNumber?: string;
  services?: string[];
  operatingHours?: string;
  emergencyContact?: string;
  description?: string;
  acceptsInsurance?: boolean;
  hasDelivery?: boolean;
  hasConsultation?: boolean;
  userId?: string;
  images?: string[]; // Array of image URIs
}

export interface Pharmacy {
  id: number;
  user_id?: string;
  name: string;
  facility_type: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  license_number: string;
  registration_number?: string;
  services?: string[];
  operating_hours?: string;
  emergency_contact?: string;
  description?: string;
  accepts_insurance: boolean;
  has_delivery: boolean;
  has_consultation: boolean;
  images?: string[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

// Pharmacy Service
class PharmacyService {
  // Register a new pharmacy
  async registerPharmacy(data: PharmacyRegistrationData): Promise<ApiResponse<{ pharmacy: Pharmacy }>> {
    try {
      
      // Create FormData for multipart/form-data submission
      const formData = new FormData();
      
      // Add text fields
      formData.append('pharmacyName', data.pharmacyName);
      formData.append('ownerName', data.ownerName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('address', data.address);
      formData.append('city', data.city);
      
      if (data.region) formData.append('region', data.region);
      if (data.postalCode) formData.append('postalCode', data.postalCode);
      if (data.latitude) formData.append('latitude', data.latitude);
      if (data.longitude) formData.append('longitude', data.longitude);
      if (data.licenseNumber) formData.append('licenseNumber', data.licenseNumber);
      if (data.registrationNumber) formData.append('registrationNumber', data.registrationNumber);
      if (data.operatingHours) formData.append('operatingHours', data.operatingHours);
      if (data.emergencyContact) formData.append('emergencyContact', data.emergencyContact);
      if (data.description) formData.append('description', data.description);
      
      // Add boolean fields
      if (data.acceptsInsurance !== undefined) formData.append('acceptsInsurance', data.acceptsInsurance.toString());
      if (data.hasDelivery !== undefined) formData.append('hasDelivery', data.hasDelivery.toString());
      if (data.hasConsultation !== undefined) formData.append('hasConsultation', data.hasConsultation.toString());
      if (data.userId) formData.append('userId', data.userId.toString());
      
      // Add services array
      if (data.services && data.services.length > 0) {
        data.services.forEach(service => {
          formData.append('services[]', service);
        });
      }
      
      // Add images - React Native specific approach
      if (data.images && data.images.length > 0) {
        console.log('🔍 PharmacyService - Processing images for upload...');
        data.images.forEach((imageUri, index) => {
          console.log(`🔍 PharmacyService - Processing image ${index + 1}:`, imageUri);
          
          // Create proper file object for React Native
          // React Native FormData expects objects with uri, type, and name properties
          const imageFile = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `pharmacy-image-${Date.now()}-${index}.jpg`
          } as any;
          
          // For React Native, we need to append the file object directly
          // The network layer will handle the multipart encoding
          formData.append('images', imageFile);
          console.log(`✅ PharmacyService - Image ${index + 1} added to FormData:`, {
            uri: imageFile.uri,
            type: imageFile.type,
            name: imageFile.name
          });
        });
      } else {
        console.log('⚠️ PharmacyService - No images to upload');
      }
      
      console.log('🔍 PharmacyService - FormData created, submitting registration...');
      console.log('🔍 PharmacyService - Data being sent:', {
        pharmacyName: data.pharmacyName,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        region: data.region,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        licenseNumber: data.licenseNumber,
        registrationNumber: data.registrationNumber,
        services: data.services,
        operatingHours: data.operatingHours,
        emergencyContact: data.emergencyContact,
        description: data.description,
        acceptsInsurance: data.acceptsInsurance,
        hasDelivery: data.hasDelivery,
        hasConsultation: data.hasConsultation,
        userId: data.userId,
        images: data.images
      });
      
       // Debug FormData contents
       console.log('🔍 PharmacyService - FormData type:', typeof formData);
       console.log('🔍 PharmacyService - FormData constructor:', formData.constructor.name);
       console.log('🔍 PharmacyService - FormData is FormData:', formData instanceof FormData);
       console.log('🔍 PharmacyService - FormData has append method:', typeof formData.append === 'function');
       
       // Try to debug FormData contents (React Native specific)
       try {
         const formDataAny = formData as any;
         if (formDataAny._parts) {
           console.log('🔍 PharmacyService - FormData parts count:', formDataAny._parts.length);
           const imageParts = formDataAny._parts.filter((part: any) => part.name === 'images');
           console.log('🔍 PharmacyService - Image parts count:', imageParts.length);
         }
       } catch (e) {
         console.log('🔍 PharmacyService - Cannot access FormData internals (normal in React Native)');
       }
      
      // Use direct axios for React Native FormData (more reliable)
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔍 PharmacyService - Making direct axios request for React Native FormData');
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.FACILITIES.PHARMACY_REGISTER}`,
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
      const apiResponse: ApiResponse<{ pharmacy: Pharmacy }> = {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error
      };
      
      console.log('🔍 PharmacyService - Registration response:', {
        success: apiResponse.success,
        hasData: !!apiResponse.data,
        message: apiResponse.message
      });
      
      if (apiResponse.success && apiResponse.data) {
        console.log('✅ PharmacyService - Registration successful');
        console.log('📸 Images in response:', apiResponse.data.pharmacy.images);
      } else {
        console.log('❌ PharmacyService - Registration failed:', apiResponse.message);
      }
      
      return apiResponse;
    } catch (error) {
      console.error('❌ PharmacyService - Registration error:', error);
      return {
        success: false,
        message: 'Failed to register pharmacy. Please try again.',
        error: 'Registration Error',
      };
    }
  }

  // Get pharmacy by ID
  async getPharmacyById(id: string): Promise<ApiResponse<Pharmacy>> {
    try {
      return await apiClient.get<Pharmacy>(API_ENDPOINTS.FACILITIES.GET_BY_ID(id));
    } catch (error) {
      console.error('Get pharmacy error:', error);
      return {
        success: false,
        message: 'Failed to get pharmacy details. Please try again.',
        error: 'Pharmacy Error',
      };
    }
  }

  // Get all pharmacies
  async getPharmacies(params?: {
    city?: string;
    search?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<Pharmacy[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.city) queryParams.append('city', params.city);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.latitude) queryParams.append('latitude', params.latitude.toString());
      if (params?.longitude) queryParams.append('longitude', params.longitude.toString());
      if (params?.radius) queryParams.append('radius', params.radius.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      
      queryParams.append('type', 'pharmacy');
      
      const url = `${API_ENDPOINTS.FACILITIES.LIST}?${queryParams.toString()}`;
      return await apiClient.get<Pharmacy[]>(url);
    } catch (error) {
      console.error('Get pharmacies error:', error);
      return {
        success: false,
        message: 'Failed to get pharmacies. Please try again.',
        error: 'Pharmacies Error',
      };
    }
  }

  // Get nearby pharmacies
  async getNearbyPharmacies(latitude: number, longitude: number, radius: number = 10): Promise<ApiResponse<Pharmacy[]>> {
    try {
      const queryParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(),
        type: 'pharmacy'
      });
      
      const url = `${API_ENDPOINTS.FACILITIES.SEARCH_NEARBY}?${queryParams.toString()}`;
      return await apiClient.get<Pharmacy[]>(url);
    } catch (error) {
      console.error('Get nearby pharmacies error:', error);
      return {
        success: false,
        message: 'Failed to get nearby pharmacies. Please try again.',
        error: 'Nearby Pharmacies Error',
      };
    }
  }
}

// Export singleton instance
export const pharmacyService = new PharmacyService();
