import { apiClient } from './apiClient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS } from '../constants/API';

export interface PharmacistRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  licenseNumber: string;
  education: string;
  experience: string;
  specializations: string[];
  currentWorkplace?: string;
  emergencyContact: string;
  bio?: string;
  hasConsultation: boolean;
  hasCompounding: boolean;
  hasVaccination: boolean;
  acceptsInsurance: boolean;
  userId?: string;
  profileImage?: string;
}

export interface PharmacistRegistrationResponse {
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

class PharmacistServiceNew {
  async registerPharmacist(data: PharmacistRegistration): Promise<PharmacistRegistrationResponse> {
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
      formData.append('education', data.education);
      formData.append('experience', data.experience);
      formData.append('emergencyContact', data.emergencyContact);
      if (data.userId) {
        formData.append('userId', data.userId);
      }
      
      // Add optional fields
      if (data.currentWorkplace) {
        formData.append('currentWorkplace', data.currentWorkplace);
      }
      if (data.bio) {
        formData.append('bio', data.bio);
      }
      
      // Add boolean fields
      formData.append('hasConsultation', data.hasConsultation.toString());
      formData.append('hasCompounding', data.hasCompounding.toString());
      formData.append('hasVaccination', data.hasVaccination.toString());
      formData.append('acceptsInsurance', data.acceptsInsurance.toString());
      
      // Add specializations as JSON string
      formData.append('specializations', JSON.stringify(data.specializations));
      
      // Add profile image if provided
      if (data.profileImage) {
        const imageUri = data.profileImage;
        const filename = imageUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        // React Native FormData format - use the correct structure
        const imageFile = {
          uri: imageUri,
          type: type,
          name: filename,
        };
        
        // React Native FormData requires the file object to be passed directly
        formData.append('profileImage', imageFile as any);
      }
      
      // Use direct axios for React Native FormData (more reliable)
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PROFESSIONALS.REGISTER}`,
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
      
      // Handle direct axios response
      if (response && response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Pharmacist registered successfully',
          data: response.data.data as PharmacistRegistrationResponse['data']
        };
      } else {
        return {
          success: false,
          message: response.data?.message || 'Registration failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Pharmacist registration error:', error);
      
      return {
        success: false,
        message: 'Failed to register pharmacist. Please try again.'
      };
    }
  }
}

export const pharmacistServiceNew = new PharmacistServiceNew();
