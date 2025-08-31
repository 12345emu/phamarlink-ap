import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

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
      console.log('🔍 PharmacyService - Starting pharmacy registration...');
      
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
      
      // Add images
      if (data.images && data.images.length > 0) {
        data.images.forEach((imageUri, index) => {
          const imageFile = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `pharmacy-image-${index}.jpg`
          } as any;
          formData.append('images', imageFile);
        });
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
      
      const response = await apiClient.post<{ pharmacy: Pharmacy }>(
        API_ENDPOINTS.FACILITIES.PHARMACY_REGISTER,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('🔍 PharmacyService - Registration response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      
      return response;
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
