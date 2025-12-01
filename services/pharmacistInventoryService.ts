import { apiClient, ApiResponse } from './apiClient';
import { API_CONFIG, API_ENDPOINTS } from '../constants/API';

export interface InventoryMedicine {
  id: number;
  medicine_id: number;
  pharmacy_medicine_id: number;
  name: string;
  generic_name?: string;
  brand_name?: string;
  category: string;
  dosage_form?: string;
  strength?: string;
  manufacturer?: string;
  prescription_required: boolean;
  stock_quantity: number;
  price: number;
  discount_price?: number;
  expiry_date?: string;
  batch_number?: string;
  is_available: boolean;
  low_stock_threshold?: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
}

export interface AddMedicineToInventoryData {
  medicine_id: number;
  stock_quantity: number;
  price: number;
  discount_price?: number;
  expiry_date?: string;
  batch_number?: string;
  is_available?: boolean;
}

export interface UpdateInventoryData {
  stock_quantity?: number;
  price?: number;
  discount_price?: number;
  expiry_date?: string;
  batch_number?: string;
  is_available?: boolean;
}

export interface InventoryStats {
  totalMedicines: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringSoon: number;
  categories: { category: string; count: number }[];
}

class PharmacistInventoryService {
  private _cachedFacilityId: number | null = null;

  /**
   * Get pharmacist's facility ID from their user profile
   * Queries healthcare_professionals table to find facility_id for current user
   * Uses caching to avoid repeated API calls
   */
  async getPharmacistFacilityId(): Promise<number | null> {
    // Return cached value if available
    if (this._cachedFacilityId !== null) {
      return this._cachedFacilityId;
    }

    try {
      // Use the new /professionals/me endpoint to get current user's professional record
      console.log('🔍 Fetching pharmacist facility_id from /professionals/me');
      const response = await apiClient.get<any>(`${API_CONFIG.BASE_URL}/professionals/me`);
      
      console.log('🔍 Response from /professionals/me:', {
        success: response.success,
        hasData: !!response.data,
        data: response.data
      });
      
      if (response.success && response.data) {
        const professional = response.data;
        
        if (professional && professional.facility_id) {
          this._cachedFacilityId = parseInt(professional.facility_id);
          console.log('✅ Found pharmacist facility_id:', this._cachedFacilityId);
          return this._cachedFacilityId;
        } else {
          console.warn('⚠️ Professional record found but no facility_id');
          console.warn('⚠️ Professional data:', professional);
        }
      } else {
        console.warn('⚠️ Could not get professional record:', response.message);
        console.warn('⚠️ Full response:', response);
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Get pharmacist facility ID error:', error);
      console.error('❌ Error response:', error.response?.data);
      if (error.response?.status === 404) {
        console.warn('⚠️ Professional record not found. User may need to register as a professional.');
      } else if (error.response?.status === 403) {
        console.warn('⚠️ Access denied. User may not be a pharmacist or doctor.');
      }
      return null;
    }
  }

  /**
   * Clear cached facility ID (useful when pharmacist changes facility)
   */
  clearFacilityIdCache() {
    this._cachedFacilityId = null;
  }

  /**
   * Get inventory medicines for pharmacist's facility
   */
  async getInventory(
    search?: string,
    category?: string,
    lowStockOnly?: boolean,
    outOfStockOnly?: boolean
  ): Promise<ApiResponse<InventoryMedicine[]>> {
    try {
      const facilityId = await this.getPharmacistFacilityId();
      
      if (!facilityId) {
        return {
          success: false,
          message: 'Unable to determine your pharmacy facility. Please contact support.',
          error: 'Facility Not Found',
        };
      }

      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category) queryParams.append('category', category);
      if (lowStockOnly) queryParams.append('low_stock', 'true');
      if (outOfStockOnly) queryParams.append('out_of_stock', 'true');

      const url = `${API_ENDPOINTS.FACILITIES.GET_MEDICINES(facilityId.toString())}?${queryParams.toString()}`;
      const response = await apiClient.get<any>(url);

      if (response.success && response.data) {
        // The backend returns medicines grouped by category in medicines_by_category
        // We need to flatten it into an array
        let medicines: any[] = [];
        
        if (response.data.medicines_by_category) {
          // Flatten the category-grouped object into an array
          Object.values(response.data.medicines_by_category).forEach((categoryMedicines: any) => {
            if (Array.isArray(categoryMedicines)) {
              medicines = medicines.concat(categoryMedicines);
            }
          });
        } else if (Array.isArray(response.data)) {
          // Fallback: if it's already an array
          medicines = response.data;
        } else if (response.data.medicines && Array.isArray(response.data.medicines)) {
          // Another fallback: if medicines is a direct array property
          medicines = response.data.medicines;
        }
        
        console.log(`✅ Found ${medicines.length} medicines for facility ${facilityId}`);
        
        const transformedMedicines: InventoryMedicine[] = medicines.map((med: any) => ({
          id: med.id,
          medicine_id: med.id,
          pharmacy_medicine_id: med.pharmacy_medicine_id || med.id,
          name: med.name,
          generic_name: med.generic_name,
          brand_name: med.brand_name,
          category: med.category || 'Other',
          dosage_form: med.dosage_form,
          strength: med.strength,
          manufacturer: med.manufacturer,
          prescription_required: med.prescription_required || false,
          stock_quantity: med.stock_quantity || 0,
          price: med.price || 0,
          discount_price: med.discount_price,
          expiry_date: med.expiry_date,
          batch_number: med.batch_number,
          is_available: med.is_available !== undefined ? med.is_available : true,
          created_at: med.created_at || new Date().toISOString(),
          updated_at: med.updated_at || new Date().toISOString(),
        }));

        return {
          success: true,
          data: transformedMedicines,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to fetch inventory',
        error: 'Inventory Fetch Error',
      };
    } catch (error) {
      console.error('Get inventory error:', error);
      return {
        success: false,
        message: 'Failed to fetch inventory. Please try again.',
        error: 'Inventory Fetch Error',
      };
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<ApiResponse<InventoryStats>> {
    try {
      const inventoryResponse = await this.getInventory();
      
      if (!inventoryResponse.success || !inventoryResponse.data) {
        return {
          success: false,
          message: 'Failed to fetch inventory statistics',
          error: 'Stats Error',
        };
      }

      const medicines = inventoryResponse.data;
      const totalMedicines = medicines.length;
      const totalStockValue = medicines.reduce((sum, med) => sum + (med.stock_quantity * med.price), 0);
      const lowStockItems = medicines.filter(med => med.stock_quantity > 0 && med.stock_quantity <= 10).length;
      const outOfStockItems = medicines.filter(med => med.stock_quantity === 0).length;
      
      // Check for expiring medicines (within 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      const expiringSoon = medicines.filter(med => {
        if (!med.expiry_date) return false;
        const expiryDate = new Date(med.expiry_date);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
      }).length;

      // Group by category
      const categoryMap = new Map<string, number>();
      medicines.forEach(med => {
        const cat = med.category || 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const categories = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      }));

      return {
        success: true,
        data: {
          totalMedicines,
          totalStockValue,
          lowStockItems,
          outOfStockItems,
          expiringSoon,
          categories,
        },
      };
    } catch (error) {
      console.error('Get inventory stats error:', error);
      return {
        success: false,
        message: 'Failed to fetch inventory statistics',
        error: 'Stats Error',
      };
    }
  }

  /**
   * Add medicine to inventory
   */
  async addMedicineToInventory(data: AddMedicineToInventoryData): Promise<ApiResponse<any>> {
    try {
      const facilityId = await this.getPharmacistFacilityId();
      
      if (!facilityId) {
        return {
          success: false,
          message: 'Unable to determine your pharmacy facility. Please contact support.',
          error: 'Facility Not Found',
        };
      }

      // Use POST to /facilities/:id/medicines endpoint
      const url = `${API_CONFIG.BASE_URL}/facilities/${facilityId}/medicines`;
      console.log('🔍 Adding medicine to inventory - URL:', url);
      console.log('🔍 Adding medicine to inventory - Data:', data);
      console.log('🔍 Adding medicine to inventory - Facility ID:', facilityId);
      
      const response = await apiClient.post<any>(url, data);
      
      console.log('🔍 Add medicine response:', response);

      return response;
    } catch (error) {
      console.error('Add medicine to inventory error:', error);
      return {
        success: false,
        message: 'Failed to add medicine to inventory. Please try again.',
        error: 'Add Medicine Error',
      };
    }
  }

  /**
   * Update medicine in inventory
   */
  async updateMedicineInInventory(
    pharmacyMedicineId: number,
    data: UpdateInventoryData
  ): Promise<ApiResponse<any>> {
    try {
      const facilityId = await this.getPharmacistFacilityId();
      
      if (!facilityId) {
        return {
          success: false,
          message: 'Unable to determine your pharmacy facility. Please contact support.',
          error: 'Facility Not Found',
        };
      }

      // Use the facilities endpoint to update medicine
      const url = `${API_CONFIG.BASE_URL}/facilities/${facilityId}/medicines`;
      const response = await apiClient.put<any>(`${url}/${pharmacyMedicineId}`, data);

      return response;
    } catch (error) {
      console.error('Update medicine in inventory error:', error);
      return {
        success: false,
        message: 'Failed to update medicine. Please try again.',
        error: 'Update Medicine Error',
      };
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(pharmacyMedicineId: number, quantity: number, operation: 'add' | 'set' = 'set'): Promise<ApiResponse<any>> {
    try {
      // First get current stock
      const inventoryResponse = await this.getInventory();
      
      if (!inventoryResponse.success || !inventoryResponse.data) {
        return {
          success: false,
          message: 'Failed to fetch current inventory',
          error: 'Inventory Fetch Error',
        };
      }

      const medicine = inventoryResponse.data.find(m => m.pharmacy_medicine_id === pharmacyMedicineId);
      
      if (!medicine) {
        return {
          success: false,
          message: 'Medicine not found in inventory',
          error: 'Medicine Not Found',
        };
      }

      const newQuantity = operation === 'add' 
        ? medicine.stock_quantity + quantity 
        : quantity;

      return await this.updateMedicineInInventory(pharmacyMedicineId, {
        stock_quantity: newQuantity,
      });
    } catch (error) {
      console.error('Update stock error:', error);
      return {
        success: false,
        message: 'Failed to update stock. Please try again.',
        error: 'Update Stock Error',
      };
    }
  }

  /**
   * Delete/Remove medicine from inventory
   */
  async removeMedicineFromInventory(pharmacyMedicineId: number): Promise<ApiResponse<any>> {
    try {
      const facilityId = await this.getPharmacistFacilityId();
      
      if (!facilityId) {
        return {
          success: false,
          message: 'Unable to determine your pharmacy facility. Please contact support.',
          error: 'Facility Not Found',
        };
      }

      // Set is_available to false instead of deleting
      return await this.updateMedicineInInventory(pharmacyMedicineId, {
        is_available: false,
      });
    } catch (error) {
      console.error('Remove medicine from inventory error:', error);
      return {
        success: false,
        message: 'Failed to remove medicine. Please try again.',
        error: 'Remove Medicine Error',
      };
    }
  }
}

// Export singleton instance
export const pharmacistInventoryService = new PharmacistInventoryService();

