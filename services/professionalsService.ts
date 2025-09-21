import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS, API_CONFIG } from '../constants/API';

// Base URL for static files (without /api)
const STATIC_BASE_URL = API_CONFIG.BASE_URL.replace('/api', '');

// Types
export interface HealthcareProfessional {
  id: number;
  user_id: number;
  facility_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialty: string;
  license_number: string;
  experience_years: number;
  education: string;
  bio?: string;
  consultation_fee?: number;
  languages?: string[];
  is_available: boolean;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  // Additional properties from database
  qualification?: string;
  rating?: number;
  total_reviews?: number;
  is_verified?: boolean;
  // Facility information
  facility_name?: string;
  facility_type?: string;
  facility_address?: string;
  facility_phone?: string;
  // User information
  user_type?: string;
  is_active?: boolean;
}

export interface ProfessionalSearchParams {
  specialty?: string;
  facility_type?: string;
  is_available?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

class ProfessionalsService {
  // Helper method to process professionals data and convert relative image paths to full URLs
  private processProfessionalsData(professionals: HealthcareProfessional[]): HealthcareProfessional[] {
    return professionals.map(professional => ({
      ...professional,
      profile_image: professional.profile_image && professional.profile_image !== 'null'
        ? `${STATIC_BASE_URL}${professional.profile_image}`
        : null
    }));
  }

  // Get all healthcare professionals
  async getProfessionals(params?: ProfessionalSearchParams): Promise<ApiResponse<{ professionals: HealthcareProfessional[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.specialty) queryParams.append('specialty', params.specialty);
      if (params?.facility_type) queryParams.append('facility_type', params.facility_type);
      if (params?.is_available !== undefined) queryParams.append('is_available', params.is_available.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.PROFESSIONALS.BASE}?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      
      // Ensure we always return a valid response object
      if (response && response.data && typeof response.data === 'object') {
        // Check if the response already has success field
        if ('success' in response.data) {
          const responseData = response.data as ApiResponse<{ professionals: HealthcareProfessional[]; pagination: any }>;
          // Process professionals data to convert relative image paths to full URLs
          if (responseData.data && responseData.data.professionals) {
            responseData.data.professionals = this.processProfessionalsData(responseData.data.professionals);
          }
          return responseData;
        } else {
          // Wrap the response data in the proper ApiResponse format
          const responseData = response.data as { professionals: HealthcareProfessional[]; pagination: any };
          // Process professionals data to convert relative image paths to full URLs
          if (responseData.professionals) {
            responseData.professionals = this.processProfessionalsData(responseData.professionals);
          }
          return {
            success: true,
            data: responseData
          };
        }
      } else {
        return {
          success: false,
          message: 'Invalid response from server',
          error: 'Invalid Response',
        };
      }
    } catch (error: any) {
      console.error('Get professionals error:', error);
      
      // Handle specific error types
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          return {
            success: false,
            message: 'Authentication required. Please log in again.',
            error: 'Authentication Error',
          };
        } else if (status === 403) {
          return {
            success: false,
            message: 'Access denied.',
            error: 'Authorization Error',
          };
        }
        
        return {
          success: false,
          message: data?.message || `HTTP ${status} error`,
          error: 'Network Error',
        };
      }
      
      return {
        success: false,
        message: 'Failed to get professionals.',
        error: 'Unknown Error',
      };
    }
  }

  // Get professional by ID
  async getProfessionalById(id: number): Promise<ApiResponse<HealthcareProfessional>> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.PROFESSIONALS.BASE}/${id}`);
      
      if (response && response.data && typeof response.data === 'object') {
        if ('success' in response.data) {
          return response.data as ApiResponse<HealthcareProfessional>;
        } else {
          return {
            success: true,
            data: response.data as HealthcareProfessional
          };
        }
      } else {
        return {
          success: false,
          message: 'Invalid response from server',
          error: 'Invalid Response',
        };
      }
    } catch (error: any) {
      console.error('Get professional error:', error);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        return {
          success: false,
          message: data?.message || `HTTP ${status} error`,
          error: 'Network Error',
        };
      }
      
      return {
        success: false,
        message: 'Failed to get professional.',
        error: 'Unknown Error',
      };
    }
  }

  // Get professionals by specialty
  async getProfessionalsBySpecialty(specialty: string): Promise<ApiResponse<{ professionals: HealthcareProfessional[]; pagination: any }>> {
    return this.getProfessionals({ specialty });
  }

  // Get available professionals
  async getAvailableProfessionals(): Promise<ApiResponse<{ professionals: HealthcareProfessional[]; pagination: any }>> {
    return this.getProfessionals({ is_available: true });
  }

  // Get professionals by facility ID
  async getProfessionalsByFacility(facilityId: string | number, limit?: number): Promise<ApiResponse<{ professionals: HealthcareProfessional[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('facility_id', facilityId.toString());
      if (limit) queryParams.append('limit', limit.toString());

      const url = `${API_ENDPOINTS.PROFESSIONALS.BASE}/facility/${facilityId}?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      
      if (response && response.data && typeof response.data === 'object') {
        if ('success' in response.data) {
          return response.data as ApiResponse<{ professionals: HealthcareProfessional[]; pagination: any }>;
        } else {
          return {
            success: true,
            data: response.data as { professionals: HealthcareProfessional[]; pagination: any }
          };
        }
      } else {
        return {
          success: false,
          message: 'Invalid response from server',
          error: 'Invalid Response',
        };
      }
    } catch (error: any) {
      console.error('Get professionals by facility error:', error);
      return {
        success: false,
        message: 'Failed to get professionals by facility.',
        error: 'Unknown Error',
      };
    }
  }

  // Utility methods for UI
  getProfessionalColor(specialty: string): string {
    const colors: { [key: string]: string } = {
      'cardiology': '#e74c3c',
      'dermatology': '#f39c12',
      'pediatrics': '#2ecc71',
      'pharmacist': '#3498db',
      'general': '#9b59b6',
      'default': '#95a5a6'
    };
    return colors[specialty.toLowerCase()] || colors.default;
  }

  getProfessionalIcon(specialty: string): string {
    const icons: { [key: string]: string } = {
      'cardiology': 'heart',
      'dermatology': 'user-md',
      'pediatrics': 'child',
      'pharmacist': 'user',
      'general': 'user-md',
      'default': 'user-md'
    };
    return icons[specialty.toLowerCase()] || icons.default;
  }

  formatRating(rating: number): string {
    return rating ? rating.toFixed(1) : 'No rating';
  }
}

export const professionalsService = new ProfessionalsService();