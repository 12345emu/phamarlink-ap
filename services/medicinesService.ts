import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

// Types
export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  category: string;
  prescription_required: boolean | number | string;
  dosage_form?: string;
  strength?: string;
  description?: string;
  manufacturer?: string;
  image?: string;
  min_price?: number;
  max_price?: number;
  available_facilities?: number;
  avg_stock?: number;
  facility_names?: string[];
  created_at: string;
  updated_at: string;
}

export interface MedicineSearchParams {
  search?: string;
  category?: string;
  prescription_required?: boolean;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'price' | 'created_at' | 'popularity';
  sort_order?: 'ASC' | 'DESC';
}

// Medicines Service
class MedicinesService {
  // Get all medicines with optional filtering
  async getMedicines(params?: MedicineSearchParams): Promise<ApiResponse<Medicine[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.prescription_required !== undefined) queryParams.append('prescription_required', params.prescription_required.toString());
      if (params?.min_price) queryParams.append('min_price', params.min_price.toString());
      if (params?.max_price) queryParams.append('max_price', params.max_price.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

      const url = `${API_ENDPOINTS.MEDICINES.LIST}?${queryParams.toString()}`;
      const response = await apiClient.get<any>(url);
      
      // Handle the backend response structure
      if (response.success && response.data && response.data.medicines) {
        return {
          success: true,
          data: response.data.medicines,
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get medicines error:', error);
      return {
        success: false,
        message: 'Failed to fetch medicines. Please try again.',
        error: 'Medicines Fetch Error',
      };
    }
  }

  // Get medicines available for home page
  async getAvailableMedicines(limit: number = 10): Promise<ApiResponse<Medicine[]>> {
    try {
      const url = `${API_ENDPOINTS.MEDICINES.LIST}/home/available?limit=${limit}`;
      const response = await apiClient.get<any>(url);
      
      if (response.success && response.data && response.data.medicines) {
        return {
          success: true,
          data: response.data.medicines,
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get available medicines error:', error);
      return {
        success: false,
        message: 'Failed to fetch available medicines. Please try again.',
        error: 'Available Medicines Error',
      };
    }
  }

  // Get medicine by ID
  async getMedicineById(id: string): Promise<ApiResponse<Medicine>> {
    try {
      const url = API_ENDPOINTS.MEDICINES.GET_BY_ID(id);
      return await apiClient.get<Medicine>(url);
    } catch (error) {
      console.error('Get medicine by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch medicine details. Please try again.',
        error: 'Medicine Details Error',
      };
    }
  }

  // Search medicines by symptoms
  async searchBySymptoms(symptoms: string): Promise<ApiResponse<Medicine[]>> {
    try {
      const url = `${API_ENDPOINTS.MEDICINES.SEARCH_BY_SYMPTOM}?symptoms=${encodeURIComponent(symptoms)}`;
      return await apiClient.get<Medicine[]>(url);
    } catch (error) {
      console.error('Search medicines by symptoms error:', error);
      return {
        success: false,
        message: 'Failed to search medicines by symptoms. Please try again.',
        error: 'Symptoms Search Error',
      };
    }
  }

  // Get medicine categories
  async getCategories(): Promise<ApiResponse<{ category: string; count: number }[]>> {
    try {
      const url = `${API_ENDPOINTS.MEDICINES.LIST}/categories/list`;
      return await apiClient.get<{ category: string; count: number }[]>(url);
    } catch (error) {
      console.error('Get medicine categories error:', error);
      return {
        success: false,
        message: 'Failed to fetch medicine categories. Please try again.',
        error: 'Categories Error',
      };
    }
  }

  // Get medicines by category
  async getMedicinesByCategory(category: string): Promise<ApiResponse<Medicine[]>> {
    try {
      return await this.getMedicines({ category });
    } catch (error) {
      console.error('Get medicines by category error:', error);
      return {
        success: false,
        message: `Failed to fetch ${category} medicines. Please try again.`,
        error: 'Category Medicines Error',
      };
    }
  }

  // Format price range
  formatPriceRange(minPrice?: number, maxPrice?: number): string {
    if (!minPrice && !maxPrice) return 'Price not available';
    if (minPrice === maxPrice) return `GHS ${minPrice}`;
    if (minPrice && maxPrice) return `GHS ${minPrice} - ${maxPrice}`;
    if (minPrice) return `From GHS ${minPrice}`;
    if (maxPrice) return `Up to GHS ${maxPrice}`;
    return 'Price not available';
  }

  // Get medicine icon based on category
  getMedicineIcon(category: string): string {
    const categoryIcons: { [key: string]: string } = {
      'Analgesic': 'medkit',
      'Antibiotic': 'bug',
      'Antihistamine': 'leaf',
      'Antiviral': 'shield',
      'Cardiovascular': 'heartbeat',
      'Diabetes': 'tint',
      'Gastrointestinal': 'stomach',
      'Respiratory': 'lungs',
      'Vitamins': 'star',
      'default': 'medkit'
    };
    
    return categoryIcons[category] || categoryIcons.default;
  }

  // Get medicine color based on category
  getMedicineColor(category: string): string {
    const categoryColors: { [key: string]: string } = {
      'Analgesic': '#e74c3c',
      'Antibiotic': '#3498db',
      'Antihistamine': '#2ecc71',
      'Antiviral': '#9b59b6',
      'Cardiovascular': '#e67e22',
      'Diabetes': '#f39c12',
      'Gastrointestinal': '#1abc9c',
      'Respiratory': '#34495e',
      'Vitamins': '#f1c40f',
      'default': '#95a5a6'
    };
    
    return categoryColors[category] || categoryColors.default;
  }
}

// Export singleton instance
export const medicinesService = new MedicinesService();