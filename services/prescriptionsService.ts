import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Prescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  facility_id: string;
  facility_name: string;
  appointment_date: string;
  prescription_text: string;
  medicines: PrescriptionMedicine[];
  diagnosis?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionMedicine {
  id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
}

export interface UploadPrescriptionData {
  image: string; // Base64 or file URI
  description?: string;
}

export interface PrescriptionSearchParams {
  search?: string;
  doctor_id?: string;
  facility_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// Prescriptions Service
class PrescriptionsService {
  // Get user's prescriptions
  async getPrescriptions(params?: PrescriptionSearchParams): Promise<ApiResponse<Prescription[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.doctor_id) queryParams.append('doctor_id', params.doctor_id);
      if (params?.facility_id) queryParams.append('facility_id', params.facility_id);
      if (params?.date_from) queryParams.append('date_from', params.date_from);
      if (params?.date_to) queryParams.append('date_to', params.date_to);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.PRESCRIPTIONS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await apiClient.get<Prescription[]>(url);
    } catch (error) {
      console.error('Get prescriptions error:', error);
      return {
        success: false,
        message: 'Failed to fetch prescriptions. Please try again.',
        error: 'Prescriptions Fetch Error',
      };
    }
  }

  // Get prescription by ID
  async getPrescriptionById(prescriptionId: string): Promise<ApiResponse<Prescription>> {
    try {
      return await apiClient.get<Prescription>(API_ENDPOINTS.PRESCRIPTIONS.GET_BY_ID(prescriptionId));
    } catch (error) {
      console.error('Get prescription error:', error);
      return {
        success: false,
        message: 'Failed to fetch prescription. Please try again.',
        error: 'Prescription Fetch Error',
      };
    }
  }

  // Upload prescription image
  async uploadPrescription(prescriptionData: UploadPrescriptionData): Promise<ApiResponse<{ prescription_id: string; message: string }>> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      console.log('🔍 Creating FormData for prescription upload');
      console.log('🔍 Image URI:', prescriptionData.image);
      console.log('🔍 Description:', prescriptionData.description);
      
      // Add the image file with the correct field name
      formData.append('prescription_image', {
        uri: prescriptionData.image,
        type: 'image/jpeg',
        name: 'prescription.jpg',
      } as any);
      
      // Add description if provided
      if (prescriptionData.description) {
        formData.append('description', prescriptionData.description);
      }
      
      console.log('🔍 FormData created, using direct axios call');
      console.log('🔍 FormData type:', typeof formData);
      console.log('🔍 FormData constructor:', formData.constructor?.name);
      console.log('🔍 FormData has append method:', typeof formData.append === 'function');
      
      // Use direct axios call to bypass apiClient FormData detection issues
      const axios = require('axios');
      const { API_CONFIG } = require('../constants/API');
      
      // Get auth token
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔍 Auth token retrieved:', token ? 'Token found' : 'No token');
      console.log('🔍 Token value:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const requestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      };
      
      console.log('🔍 Request URL:', `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRESCRIPTIONS.UPLOAD}`);
      console.log('🔍 Request headers:', requestConfig.headers);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRESCRIPTIONS.UPLOAD}`,
        formData,
        requestConfig
      );
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Prescription uploaded successfully'
      };
      
    } catch (error) {
      console.error('Upload prescription error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload prescription. Please try again.',
        error: 'Prescription Upload Error',
      };
    }
  }

  // Get prescription medicines
  async getPrescriptionMedicines(prescriptionId: string): Promise<ApiResponse<PrescriptionMedicine[]>> {
    try {
      return await apiClient.get<PrescriptionMedicine[]>(
        API_ENDPOINTS.PRESCRIPTIONS.GET_MEDICINES(prescriptionId)
      );
    } catch (error) {
      console.error('Get prescription medicines error:', error);
      return {
        success: false,
        message: 'Failed to fetch prescription medicines. Please try again.',
        error: 'Prescription Medicines Fetch Error',
      };
    }
  }

  // Add medicine to prescription
  async addMedicineToPrescription(
    prescriptionId: string, 
    medicineData: Omit<PrescriptionMedicine, 'id'>
  ): Promise<ApiResponse<PrescriptionMedicine>> {
    try {
      return await apiClient.post<PrescriptionMedicine>(
        API_ENDPOINTS.PRESCRIPTIONS.ADD_MEDICINE(prescriptionId),
        medicineData
      );
    } catch (error) {
      console.error('Add medicine to prescription error:', error);
      return {
        success: false,
        message: 'Failed to add medicine to prescription. Please try again.',
        error: 'Add Medicine Error',
      };
    }
  }

  // Update prescription medicine
  async updatePrescriptionMedicine(
    prescriptionId: string,
    medicineId: string,
    medicineData: Partial<PrescriptionMedicine>
  ): Promise<ApiResponse<PrescriptionMedicine>> {
    try {
      return await apiClient.put<PrescriptionMedicine>(
        API_ENDPOINTS.PRESCRIPTIONS.UPDATE_MEDICINE(prescriptionId, medicineId),
        medicineData
      );
    } catch (error) {
      console.error('Update prescription medicine error:', error);
      return {
        success: false,
        message: 'Failed to update prescription medicine. Please try again.',
        error: 'Update Medicine Error',
      };
    }
  }

  // Remove medicine from prescription
  async removeMedicineFromPrescription(
    prescriptionId: string,
    medicineId: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      return await apiClient.delete<{ message: string }>(
        API_ENDPOINTS.PRESCRIPTIONS.REMOVE_MEDICINE(prescriptionId, medicineId)
      );
    } catch (error) {
      console.error('Remove medicine from prescription error:', error);
      return {
        success: false,
        message: 'Failed to remove medicine from prescription. Please try again.',
        error: 'Remove Medicine Error',
      };
    }
  }

  // Format prescription date
  formatPrescriptionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format prescription duration
  formatDuration(duration: string): string {
    // Handle different duration formats
    if (duration.includes('days')) return duration;
    if (duration.includes('weeks')) return duration;
    if (duration.includes('months')) return duration;
    
    // If it's just a number, assume days
    const num = parseInt(duration);
    if (!isNaN(num)) {
      return `${num} day${num > 1 ? 's' : ''}`;
    }
    
    return duration;
  }

  // Get prescription status color
  getPrescriptionStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return '#43e97b';
      case 'completed':
        return '#3498db';
      case 'expired':
        return '#e74c3c';
      case 'cancelled':
        return '#95a5a6';
      default:
        return '#f39c12';
    }
  }

  // Get prescription status icon
  getPrescriptionStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'check-circle';
      case 'completed':
        return 'check-circle-o';
      case 'expired':
        return 'times-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'clock-o';
    }
  }
}

// Export singleton instance
export const prescriptionsService = new PrescriptionsService();
