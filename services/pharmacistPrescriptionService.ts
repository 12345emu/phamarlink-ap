import { apiClient, ApiResponse } from './apiClient';
import { API_CONFIG } from '../constants/API';

export interface PharmacistPrescription {
  id: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  doctorId: number;
  doctorName: string;
  appointmentId?: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  refills: number;
  status: 'active' | 'pending' | 'filled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionProcessingData {
  prescriptionId: number;
  filled: boolean;
  notes?: string;
  medicinesFilled?: {
    medicineId: number;
    quantity: number;
    batchNumber?: string;
    expiryDate?: string;
  }[];
}

class PharmacistPrescriptionService {
  /**
   * Get prescriptions for pharmacist to process
   * 
   * IMPORTANT: Backend MUST filter prescriptions by pharmacist's facility_id
   * 
   * Backend Implementation Requirements:
   * 1. Get user_id from JWT token (req.user.id)
   * 2. Get pharmacist's facility_id from healthcare_professionals table:
   *    SELECT facility_id FROM healthcare_professionals WHERE user_id = ?
   * 3. Filter prescriptions by joining with appointments table:
   *    - Join prescriptions table with appointments table
   *    - Filter WHERE appointments.facility_id = pharmacist's facility_id
   *    - This ensures pharmacists only see prescriptions from their pharmacy
   * 
   * Example SQL:
   * SELECT p.*, a.facility_id, u.first_name, u.last_name, u.email
   * FROM prescriptions p
   * JOIN appointments a ON p.appointment_id = a.id
   * JOIN users u ON p.patient_id = u.id
   * WHERE a.facility_id = (SELECT facility_id FROM healthcare_professionals WHERE user_id = ?)
   * AND p.status = ? (if status filter provided)
   */
  async getPrescriptionsToProcess(
    status: 'all' | 'active' | 'pending' | 'filled' | 'completed' | 'cancelled' = 'all',
    limit: number = 20,
    page: number = 1
  ): Promise<ApiResponse<PharmacistPrescription[]>> {
    try {
      // TODO: Backend route /pharmacist/prescriptions needs to be created
      // Backend must filter by pharmacist's facility_id from healthcare_professionals table
      // For now, return empty array to prevent route not found errors
      console.log('⚠️ PharmacistPrescriptionService - Backend route not implemented yet');
      console.log('⚠️ IMPORTANT: Backend must filter prescriptions by pharmacist facility_id');
      
      // Return empty data for now until backend route is created
      return {
        success: true,
        data: [],
        message: 'Prescription service will be available soon',
      };
      
      /* 
      // Uncomment when backend route is ready:
      // Backend will automatically filter by pharmacist's facility_id from JWT token
      const queryParams = new URLSearchParams();
      if (status !== 'all') queryParams.append('status', status);
      queryParams.append('limit', limit.toString());
      queryParams.append('page', page.toString());

      const url = `${API_CONFIG.BASE_URL}/pharmacist/prescriptions?${queryParams.toString()}`;
      const response = await apiClient.get<PharmacistPrescription[]>(url);

      return response;
      */
    } catch (error) {
      console.error('Get prescriptions to process error:', error);
      return {
        success: false,
        message: 'Failed to fetch prescriptions. Please try again.',
        error: 'Prescriptions Fetch Error',
      };
    }
  }

  /**
   * Get prescription details by ID
   */
  async getPrescriptionById(prescriptionId: number): Promise<ApiResponse<PharmacistPrescription>> {
    try {
      // TODO: Backend route needs to be created
      console.log('⚠️ PharmacistPrescriptionService - Backend route not implemented yet');
      
      return {
        success: false,
        message: 'Prescription details service will be available soon',
        error: 'Route Not Implemented',
      };
      
      /* 
      // Uncomment when backend route is ready:
      const url = `${API_CONFIG.BASE_URL}/pharmacist/prescriptions/${prescriptionId}`;
      return await apiClient.get<PharmacistPrescription>(url);
      */
    } catch (error) {
      console.error('Get prescription by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch prescription details. Please try again.',
        error: 'Prescription Details Error',
      };
    }
  }

  /**
   * Process/Fill a prescription
   */
  async processPrescription(data: PrescriptionProcessingData): Promise<ApiResponse<any>> {
    try {
      // TODO: Backend route needs to be created
      console.log('⚠️ PharmacistPrescriptionService - Backend route not implemented yet');
      
      return {
        success: false,
        message: 'Prescription processing service will be available soon',
        error: 'Route Not Implemented',
      };
      
      /* 
      // Uncomment when backend route is ready:
      const url = `${API_CONFIG.BASE_URL}/pharmacist/prescriptions/${data.prescriptionId}/process`;
      const response = await apiClient.post<any>(url, {
        filled: data.filled,
        notes: data.notes,
        medicinesFilled: data.medicinesFilled,
      });

      return response;
      */
    } catch (error) {
      console.error('Process prescription error:', error);
      return {
        success: false,
        message: 'Failed to process prescription. Please try again.',
        error: 'Prescription Processing Error',
      };
    }
  }

  /**
   * Verify prescription validity
   */
  async verifyPrescription(prescriptionId: number): Promise<ApiResponse<{ valid: boolean; message?: string }>> {
    try {
      // TODO: Backend route needs to be created
      // For now, return valid to allow UI to work
      return {
        success: true,
        data: { valid: true, message: 'Verification service will be available soon' },
      };
      
      /* 
      // Uncomment when backend route is ready:
      const url = `${API_CONFIG.BASE_URL}/pharmacist/prescriptions/${prescriptionId}/verify`;
      return await apiClient.post<{ valid: boolean; message?: string }>(url);
      */
    } catch (error) {
      console.error('Verify prescription error:', error);
      return {
        success: false,
        message: 'Failed to verify prescription. Please try again.',
        error: 'Prescription Verification Error',
      };
    }
  }

  /**
   * Check inventory for prescription medicines
   */
  async checkInventory(prescriptionId: number): Promise<ApiResponse<any>> {
    try {
      // TODO: Backend route needs to be created
      // For now, return mock data to allow UI to work
      return {
        success: true,
        data: { 
          available: true, 
          quantity: 100,
          message: 'Inventory check service will be available soon'
        },
      };
      
      /* 
      // Uncomment when backend route is ready:
      const url = `${API_CONFIG.BASE_URL}/pharmacist/prescriptions/${prescriptionId}/check-inventory`;
      return await apiClient.get<any>(url);
      */
    } catch (error) {
      console.error('Check inventory error:', error);
      return {
        success: false,
        message: 'Failed to check inventory. Please try again.',
        error: 'Inventory Check Error',
      };
    }
  }
}

// Export singleton instance
export const pharmacistPrescriptionService = new PharmacistPrescriptionService();

