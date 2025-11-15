import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

// Types
export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'pharmacy' | 'clinic';
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  email?: string;
  website?: string;
  operatingHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
  services: string[];
  specialties?: string[];
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  distance?: number; // in kilometers
  images?: string[];
  amenities: string[];
  insuranceAccepted?: string[];
  emergencyServices?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FacilitySearchParams {
  type?: 'hospital' | 'pharmacy' | 'clinic';
  city?: string;
  state?: string;
  services?: string[];
  specialties?: string[];
  rating?: number;
  isOpen?: boolean;
  limit?: number;
  offset?: number;
}

export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers, default 10km
  type?: 'hospital' | 'pharmacy' | 'clinic';
  services?: string[];
  limit?: number;
}

export interface FacilityReview {
  id: string;
  facilityId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

// Facilities Service
class FacilitiesService {
  // Get all facilities with optional filtering
  async getFacilities(params?: FacilitySearchParams): Promise<ApiResponse<Facility[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.type) queryParams.append('type', params.type);
      if (params?.city) queryParams.append('city', params.city);
      if (params?.state) queryParams.append('state', params.state);
      if (params?.services) queryParams.append('services', params.services.join(','));
      if (params?.specialties) queryParams.append('specialties', params.specialties.join(','));
      if (params?.rating) queryParams.append('rating', params.rating.toString());
      if (params?.isOpen !== undefined) queryParams.append('isOpen', params.isOpen.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `${API_ENDPOINTS.FACILITIES.LIST}?${queryParams.toString()}`;
      return await apiClient.get<Facility[]>(url);
    } catch (error) {
      console.error('Get facilities error:', error);
      return {
        success: false,
        message: 'Failed to fetch facilities. Please try again.',
        error: 'Facilities Fetch Error',
      };
    }
  }

  // Get facility medicines (for pharmacies)
  async getFacilityMedicines(facilityId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.FACILITIES.GET_MEDICINES(facilityId));
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get facility medicines error:', error);
      return {
        success: false,
        message: 'Failed to fetch facility medicines. Please try again.',
        error: 'Facility Medicines Error',
      };
    }
  }

  // Get facility by ID
  async getFacilityById(id: string): Promise<ApiResponse<Facility>> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.FACILITIES.GET_BY_ID(id));
      
      if (response.success && response.data) {
        const facility = response.data;
        
        // Transform backend data to match frontend Facility interface
        const transformedFacility: Facility = {
          id: facility.id.toString(),
          name: facility.name,
          type: facility.facility_type,
          description: facility.description || '',
          address: {
            street: facility.address || '',
            city: facility.city || '',
            state: facility.state || '',
            zipCode: '',
            country: facility.country || 'Ghana',
          },
          coordinates: {
            latitude: parseFloat(facility.latitude),
            longitude: parseFloat(facility.longitude),
          },
          phone: facility.phone || '',
          email: facility.email || '',
          website: facility.website || '',
          services: facility.services ? (Array.isArray(facility.services) ? facility.services : typeof facility.services === 'string' ? facility.services.split(',').map((s: string) => s.trim()) : []) : [],
          specialties: [],
          rating: parseFloat(facility.rating) || 0,
          reviewCount: parseInt(facility.total_reviews) || 0,
          isOpen: true, // Default to true since we don't have this data from backend
          distance: 0,
          images: facility.images || [],
          amenities: [],
          insuranceAccepted: [],
          emergencyServices: false,
          createdAt: facility.created_at || new Date().toISOString(),
          updatedAt: facility.updated_at || new Date().toISOString(),
          operatingHours: {
            monday: { open: '08:00', close: '18:00', isOpen: true },
            tuesday: { open: '08:00', close: '18:00', isOpen: true },
            wednesday: { open: '08:00', close: '18:00', isOpen: true },
            thursday: { open: '08:00', close: '18:00', isOpen: true },
            friday: { open: '08:00', close: '18:00', isOpen: true },
            saturday: { open: '09:00', close: '17:00', isOpen: true },
            sunday: { open: '09:00', close: '17:00', isOpen: true },
          },
        };
        
        return {
          success: true,
          data: transformedFacility,
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get facility by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch facility details. Please try again.',
        error: 'Facility Details Error',
      };
    }
  }

  // Search facilities near a location
  async searchNearby(params: NearbySearchParams): Promise<ApiResponse<Facility[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('latitude', params.latitude.toString());
      queryParams.append('longitude', params.longitude.toString());
      
      if (params.radius) queryParams.append('radius', params.radius.toString());
      if (params.type) queryParams.append('type', params.type);
      if (params.services) queryParams.append('services', params.services.join(','));
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.FACILITIES.SEARCH_NEARBY}?${queryParams.toString()}`;
      const response = await apiClient.get<any>(url);
      
      console.log('🔍 Raw API response:', JSON.stringify(response, null, 2));
      
      // Handle the nested response structure from backend
      if (response.success && response.data && response.data.facilities) {
        console.log('🔍 Backend facilities data:', JSON.stringify(response.data.facilities, null, 2));
        
        // Transform backend data to match frontend Facility interface
        const facilities = response.data.facilities.map((facility: any) => ({
          id: facility.id.toString(),
          name: facility.name,
          type: facility.facility_type,
          description: facility.description || '',
          address: {
            street: facility.address || '',
            city: facility.city || '',
            state: facility.state || '',
            zipCode: '',
            country: facility.country || 'Ghana',
          },
          coordinates: {
            latitude: parseFloat(facility.latitude),
            longitude: parseFloat(facility.longitude),
          },
          phone: facility.phone || '',
          email: facility.email || '',
          website: facility.website || '',
          services: facility.services ? (Array.isArray(facility.services) ? facility.services : typeof facility.services === 'string' ? facility.services.split(',').map((s: string) => s.trim()) : []) : [],
          specialties: [],
          rating: parseFloat(facility.rating) || 0,
          reviewCount: parseInt(facility.total_reviews) || 0,
          isOpen: true, // Default to true since we don't have this data from backend
          distance: parseFloat(facility.distance_km) || 0,
          images: facility.images || [],
          amenities: [],
          insuranceAccepted: [],
          emergencyServices: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          operatingHours: {
            monday: { open: '08:00', close: '18:00', isOpen: true },
            tuesday: { open: '08:00', close: '18:00', isOpen: true },
            wednesday: { open: '08:00', close: '18:00', isOpen: true },
            thursday: { open: '08:00', close: '18:00', isOpen: true },
            friday: { open: '08:00', close: '18:00', isOpen: true },
            saturday: { open: '09:00', close: '17:00', isOpen: true },
            sunday: { open: '09:00', close: '17:00', isOpen: true },
          },
        }));
        
        console.log('🔍 Transformed facilities:', JSON.stringify(facilities, null, 2));
        
        return {
          success: true,
          data: facilities,
        };
      }
      
      console.log('❌ No facilities found in response');
      return response;
    } catch (error) {
      console.error('Search nearby facilities error:', error);
      return {
        success: false,
        message: 'Failed to search nearby facilities. Please try again.',
        error: 'Nearby Search Error',
      };
    }
  }

  // Get facilities by type
  async getFacilitiesByType(type: 'hospital' | 'pharmacy' | 'clinic'): Promise<ApiResponse<Facility[]>> {
    try {
      return await this.getFacilities({ type });
    } catch (error) {
      console.error('Get facilities by type error:', error);
      return {
        success: false,
        message: `Failed to fetch ${type}s. Please try again.`,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)}s Fetch Error`,
      };
    }
  }

  // Get hospitals
  async getHospitals(): Promise<ApiResponse<Facility[]>> {
    return this.getFacilitiesByType('hospital');
  }

  // Get pharmacies
  async getPharmacies(): Promise<ApiResponse<Facility[]>> {
    return this.getFacilitiesByType('pharmacy');
  }

  // Get clinics
  async getClinics(): Promise<ApiResponse<Facility[]>> {
    return this.getFacilitiesByType('clinic');
  }

  // Search facilities by name or services
  async searchFacilities(query: string, type?: 'hospital' | 'pharmacy' | 'clinic'): Promise<ApiResponse<Facility[]>> {
    try {
      const params: FacilitySearchParams = {};
      
      if (type) params.type = type;
      
      const response = await this.getFacilities(params);
      
      if (response.success && response.data) {
        // Filter by search query
        const filteredFacilities = response.data.filter(facility =>
          facility.name.toLowerCase().includes(query.toLowerCase()) ||
          facility.services.some(service => 
            service.toLowerCase().includes(query.toLowerCase())
          ) ||
          facility.specialties?.some(specialty => 
            specialty.toLowerCase().includes(query.toLowerCase())
          )
        );
        
        return {
          ...response,
          data: filteredFacilities,
        };
      }
      
      return response;
    } catch (error) {
      console.error('Search facilities error:', error);
      return {
        success: false,
        message: 'Failed to search facilities. Please try again.',
        error: 'Facility Search Error',
      };
    }
  }

  // Get facilities in a specific city
  async getFacilitiesByCity(city: string, type?: 'hospital' | 'pharmacy' | 'clinic'): Promise<ApiResponse<Facility[]>> {
    try {
      const params: FacilitySearchParams = { city };
      if (type) params.type = type;
      
      return await this.getFacilities(params);
    } catch (error) {
      console.error('Get facilities by city error:', error);
      return {
        success: false,
        message: `Failed to fetch facilities in ${city}. Please try again.`,
        error: 'City Facilities Error',
      };
    }
  }

  // Get open facilities
  async getOpenFacilities(type?: 'hospital' | 'pharmacy' | 'clinic'): Promise<ApiResponse<Facility[]>> {
    try {
      const params: FacilitySearchParams = { isOpen: true };
      if (type) params.type = type;
      
      return await this.getFacilities(params);
    } catch (error) {
      console.error('Get open facilities error:', error);
      return {
        success: false,
        message: 'Failed to fetch open facilities. Please try again.',
        error: 'Open Facilities Error',
      };
    }
  }

  // Get facilities by rating
  async getFacilitiesByRating(minRating: number, type?: 'hospital' | 'pharmacy' | 'clinic'): Promise<ApiResponse<Facility[]>> {
    try {
      const params: FacilitySearchParams = { rating: minRating };
      if (type) params.type = type;
      
      return await this.getFacilities(params);
    } catch (error) {
      console.error('Get facilities by rating error:', error);
      return {
        success: false,
        message: 'Failed to fetch facilities by rating. Please try again.',
        error: 'Rating Filter Error',
      };
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Check if facility is currently open
  isFacilityOpen(operatingHours: Facility['operatingHours']): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[dayOfWeek];
    const todayHours = operatingHours[currentDay as keyof typeof operatingHours];
    
    if (!todayHours.isOpen) return false;
    
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  }

  // Format distance for display
  formatDistance(distance: number): string {
    if (!distance || isNaN(distance)) {
      return 'N/A';
    }
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    // Round to 1 decimal place for cleaner display
    return `${Math.round(distance * 10) / 10}km`;
  }

  // Get facility status (Open/Closed)
  getFacilityStatus(facility: Facility): 'open' | 'closed' {
    return facility.isOpen ? 'open' : 'closed';
  }

  // Get facility type display name
  getFacilityTypeDisplayName(type: Facility['type']): string {
    switch (type) {
      case 'hospital':
        return 'Hospital';
      case 'pharmacy':
        return 'Pharmacy';
      case 'clinic':
        return 'Clinic';
      default:
        return 'Facility';
    }
  }

  // Get my facilities (for facility-admin users)
  async getMyFacilities(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any[]>(API_ENDPOINTS.FACILITIES.MY_FACILITIES);
      
      if (response.success && response.data) {
        // Transform backend data to match frontend Facility interface
        const facilities = response.data.map((facility: any) => ({
          id: facility.id.toString(),
          name: facility.name,
          facility_type: facility.facility_type,
          type: facility.facility_type,
          description: facility.description || '',
          address: facility.address || '',
          city: facility.city || '',
          state: facility.state || '',
          phone: facility.phone || '',
          email: facility.email || '',
          images: facility.images || [],
          services: facility.services || [],
          is_verified: facility.is_verified || false,
          is_active: facility.is_active !== false,
          created_at: facility.created_at,
          updated_at: facility.updated_at,
        }));
        
        return {
          success: true,
          data: facilities,
        };
      }
      
      return response;
    } catch (error) {
      console.error('Get my facilities error:', error);
      return {
        success: false,
        message: 'Failed to fetch your facilities. Please try again.',
        error: 'My Facilities Error',
      };
    }
  }
}

// Export singleton instance
export const facilitiesService = new FacilitiesService();

 