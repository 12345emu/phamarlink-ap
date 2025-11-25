import { apiClient } from './apiClient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS } from '../constants/API';

export interface DoctorRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  licenseNumber: string;
  medicalSchool: string;
  graduationYear: string;
  experience: string;
  specialties: string[];
  currentHospital?: string;
  emergencyContact: string;
  bio?: string;
  hasTelemedicine: boolean;
  hasEmergency: boolean;
  hasSurgery: boolean;
  acceptsInsurance: boolean;
  userId?: string;
  profileImage?: string;
  facilityId?: number;
}

export interface DoctorRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    specialty: string;
  };
}

class DoctorService {
  async registerDoctor(data: DoctorRegistration): Promise<DoctorRegistrationResponse> {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('address', data.address);
      formData.append('city', data.city);
      formData.append('licenseNumber', data.licenseNumber);
      formData.append('medicalSchool', data.medicalSchool);
      formData.append('graduationYear', data.graduationYear);
      formData.append('experience', data.experience);
      formData.append('specialties', JSON.stringify(data.specialties));
      formData.append('emergencyContact', data.emergencyContact);
      formData.append('hasTelemedicine', data.hasTelemedicine.toString());
      formData.append('hasEmergency', data.hasEmergency.toString());
      formData.append('hasSurgery', data.hasSurgery.toString());
      formData.append('acceptsInsurance', data.acceptsInsurance.toString());
      
      // Add optional fields
      if (data.currentHospital) {
        formData.append('currentHospital', data.currentHospital);
      }
      if (data.bio) {
        formData.append('bio', data.bio);
      }
      if (data.userId) {
        formData.append('userId', data.userId);
      }
      if (data.facilityId) {
        formData.append('facilityId', data.facilityId.toString());
      }
      
      // Add profile image if provided
      if (data.profileImage) {
        formData.append('profileImage', {
          uri: data.profileImage,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
      }

      console.log('Submitting doctor registration:', data);

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PROFESSIONALS.REGISTER_DOCTOR}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('Doctor registration response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Doctor registration error:', error);
      
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message || 'Registration failed';
        const errors = error.response.data?.errors;
        
        if (errors && Array.isArray(errors)) {
          const errorDetails = errors.map((err: any) => err.msg).join(', ');
          throw new Error(`${errorMessage}: ${errorDetails}`);
        }
        
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Network error. Please check your internet connection.');
      } else {
        // Something else happened
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  }

  async getDoctors(params?: {
    page?: number;
    limit?: number;
    search?: string;
    specialty?: string;
    is_available?: boolean;
  }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.specialty) queryParams.append('specialty', params.specialty);
      if (params?.is_available !== undefined) queryParams.append('is_available', params.is_available.toString());

      const response = await apiClient.get(
        `${API_ENDPOINTS.PROFESSIONALS.LIST}?${queryParams.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  }

  async getDoctorById(id: string): Promise<any> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.PROFESSIONALS.LIST}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor:', error);
      throw error;
    }
  }
}

export const doctorService = new DoctorService();
