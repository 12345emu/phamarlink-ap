import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

// Types
export interface HealthcareProfessional {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone?: string;
  specialty: string;
  qualification?: string;
  experience_years: number;
  experience_text?: string;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  is_verified: boolean;
  profile_image?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalSearchParams {
  search?: string;
  specialty?: string;
  is_available?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'rating' | 'experience_years' | 'first_name' | 'created_at';
  sort_order?: 'ASC' | 'DESC';
}

// Healthcare Professionals Service
class ProfessionalsService {
  // Get all healthcare professionals
  async getProfessionals(params?: ProfessionalSearchParams): Promise<ApiResponse<HealthcareProfessional[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.specialty) queryParams.append('specialty', params.specialty);
      if (params?.is_available !== undefined) queryParams.append('is_available', params.is_available.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

      const url = `${API_ENDPOINTS.PROFESSIONALS.LIST}?${queryParams.toString()}`;
      const response = await apiClient.get<any>(url);
      
      if (response.success && response.data && response.data.professionals) {
        return {
          success: true,
          data: response.data.professionals.map((professional: any) => ({
            ...professional,
            rating: parseFloat(professional.rating) || 0,
            total_reviews: parseInt(professional.total_reviews) || 0,
            experience_years: parseInt(professional.experience_years) || 0,
            full_name: `${professional.first_name} ${professional.last_name}`,
            experience_text: `${professional.experience_years || 0} years experience`
          })),
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get professionals error:', error);
      return {
        success: false,
        message: 'Failed to fetch healthcare professionals. Please try again.',
        error: 'Professionals Fetch Error',
      };
    }
  }

  // Get available professionals for home page
  async getAvailableProfessionals(limit: number = 5): Promise<ApiResponse<HealthcareProfessional[]>> {
    try {
      const url = `${API_ENDPOINTS.PROFESSIONALS.LIST}/home/available?limit=${limit}`;
      const response = await apiClient.get<any>(url);
      
      if (response.success && response.data && response.data.professionals) {
        return {
          success: true,
          data: response.data.professionals.map((professional: any) => ({
            ...professional,
            rating: parseFloat(professional.rating) || 0,
            total_reviews: parseInt(professional.total_reviews) || 0,
            experience_years: parseInt(professional.experience_years) || 0,
            full_name: `${professional.first_name} ${professional.last_name}`,
            experience_text: `${professional.experience_years || 0} years experience`
          })),
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get available professionals error:', error);
      return {
        success: false,
        message: 'Failed to fetch available professionals. Please try again.',
        error: 'Available Professionals Error',
      };
    }
  }

  // Get professional by ID
  async getProfessionalById(id: string): Promise<ApiResponse<HealthcareProfessional>> {
    try {
      const url = API_ENDPOINTS.PROFESSIONALS.GET_BY_ID(id);
      const response = await apiClient.get<any>(url);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            ...response.data,
            rating: parseFloat(response.data.rating) || 0,
            total_reviews: parseInt(response.data.total_reviews) || 0,
            experience_years: parseInt(response.data.experience_years) || 0,
            full_name: `${response.data.first_name} ${response.data.last_name}`,
            experience_text: `${response.data.experience_years || 0} years experience`
          },
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get professional by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch professional details. Please try again.',
        error: 'Professional Details Error',
      };
    }
  }

  // Get professional specialties
  async getSpecialties(): Promise<ApiResponse<{ specialty: string; count: number }[]>> {
    try {
      const url = `${API_ENDPOINTS.PROFESSIONALS.LIST}/specialties/list`;
      return await apiClient.get<{ specialty: string; count: number }[]>(url);
    } catch (error) {
      console.error('Get professional specialties error:', error);
      return {
        success: false,
        message: 'Failed to fetch professional specialties. Please try again.',
        error: 'Specialties Error',
      };
    }
  }

  // Get professionals by specialty
  async getProfessionalsBySpecialty(specialty: string): Promise<ApiResponse<HealthcareProfessional[]>> {
    try {
      return await this.getProfessionals({ specialty });
    } catch (error) {
      console.error('Get professionals by specialty error:', error);
      return {
        success: false,
        message: `Failed to fetch ${specialty} professionals. Please try again.`,
        error: 'Specialty Professionals Error',
      };
    }
  }

  // Get available professionals
  async getAvailableOnly(): Promise<ApiResponse<HealthcareProfessional[]>> {
    try {
      return await this.getProfessionals({ is_available: true });
    } catch (error) {
      console.error('Get available professionals error:', error);
      return {
        success: false,
        message: 'Failed to fetch available professionals. Please try again.',
        error: 'Available Professionals Error',
      };
    }
  }

  // Get top rated professionals
  async getTopRated(limit: number = 10): Promise<ApiResponse<HealthcareProfessional[]>> {
    try {
      return await this.getProfessionals({ 
        sort_by: 'rating', 
        sort_order: 'DESC', 
        limit 
      });
    } catch (error) {
      console.error('Get top rated professionals error:', error);
      return {
        success: false,
        message: 'Failed to fetch top rated professionals. Please try again.',
        error: 'Top Rated Error',
      };
    }
  }

  // Get experienced professionals
  async getExperienced(limit: number = 10): Promise<ApiResponse<HealthcareProfessional[]>> {
    try {
      return await this.getProfessionals({ 
        sort_by: 'experience_years', 
        sort_order: 'DESC', 
        limit 
      });
    } catch (error) {
      console.error('Get experienced professionals error:', error);
      return {
        success: false,
        message: 'Failed to fetch experienced professionals. Please try again.',
        error: 'Experienced Professionals Error',
      };
    }
  }

  // Format rating for display
  formatRating(rating: number | undefined | null): string {
    if (rating === undefined || rating === null || isNaN(rating)) {
      return '0.0';
    }
    return Number(rating).toFixed(1);
  }

  // Get professional status
  getProfessionalStatus(professional: HealthcareProfessional): 'available' | 'unavailable' {
    return professional.is_available ? 'available' : 'unavailable';
  }

  // Get professional icon based on specialty
  getProfessionalIcon(specialty: string): string {
    const specialtyIcons: { [key: string]: string } = {
      'General Medicine': 'user-md',
      'Pediatrics': 'child',
      'Cardiology': 'heartbeat',
      'Dermatology': 'eye',
      'Orthopedics': 'wheelchair',
      'Neurology': 'brain',
      'Psychiatry': 'brain',
      'Gynecology': 'female',
      'Urology': 'male',
      'Ophthalmology': 'eye',
      'ENT': 'ear',
      'Dentistry': 'tooth',
      'Emergency Medicine': 'ambulance',
      'Anesthesiology': 'bed',
      'Radiology': 'x-ray',
      'Pathology': 'microscope',
      'Oncology': 'shield',
      'Pulmonology': 'lungs',
      'Gastroenterology': 'stomach',
      'Endocrinology': 'tint',
      'Nephrology': 'kidney',
      'Rheumatology': 'bone',
      'Infectious Disease': 'bug',
      'default': 'user-md'
    };
    
    return specialtyIcons[specialty] || specialtyIcons.default;
  }

  // Get professional color based on specialty
  getProfessionalColor(specialty: string): string {
    const specialtyColors: { [key: string]: string } = {
      'General Medicine': '#3498db',
      'Pediatrics': '#e74c3c',
      'Cardiology': '#e67e22',
      'Dermatology': '#9b59b6',
      'Orthopedics': '#34495e',
      'Neurology': '#2c3e50',
      'Psychiatry': '#8e44ad',
      'Gynecology': '#e91e63',
      'Urology': '#2196f3',
      'Ophthalmology': '#ff9800',
      'ENT': '#4caf50',
      'Dentistry': '#00bcd4',
      'Emergency Medicine': '#f44336',
      'Anesthesiology': '#607d8b',
      'Radiology': '#795548',
      'Pathology': '#9e9e9e',
      'Oncology': '#673ab7',
      'Pulmonology': '#3f51b5',
      'Gastroenterology': '#009688',
      'Endocrinology': '#ff5722',
      'Nephrology': '#2196f3',
      'Rheumatology': '#ff9800',
      'Infectious Disease': '#4caf50',
      'default': '#95a5a6'
    };
    
    return specialtyColors[specialty] || specialtyColors.default;
  }

  // Get experience level text
  getExperienceLevel(experienceYears: number): string {
    if (experienceYears < 2) return 'Junior';
    if (experienceYears < 5) return 'Mid-level';
    if (experienceYears < 10) return 'Senior';
    if (experienceYears < 20) return 'Expert';
    return 'Veteran';
  }

  // Check if professional is highly rated
  isHighlyRated(professional: HealthcareProfessional): boolean {
    return professional.rating >= 4.5;
  }

  // Check if professional is experienced
  isExperienced(professional: HealthcareProfessional): boolean {
    return professional.experience_years >= 10;
  }
}

// Export singleton instance
export const professionalsService = new ProfessionalsService(); 