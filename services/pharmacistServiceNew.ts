import { apiClient } from './apiClient';

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
  userId: string;
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
  constructor() {
    console.log('🚨🚨🚨 NEW PHARMACIST SERVICE CONSTRUCTOR CALLED 🚨🚨🚨');
  }

  async registerPharmacist(data: PharmacistRegistration): Promise<PharmacistRegistrationResponse> {
    console.log('🚨🚨🚨 NEW PHARMACIST SERVICE FUNCTION CALLED 🚨🚨🚨');
    try {
      console.log('🚨🚨🚨 NEW PHARMACIST SERVICE UPDATED - NEW VERSION RUNNING 🚨🚨🚨');
      console.log('🔍 Sending pharmacist registration data:', data);
      console.log('🔍 Profile image in data:', data.profileImage);
      console.log('🔍 API URL:', '/professionals/register');
      
      // Create FormData for file upload
      console.log('🔍 Creating FormData for file upload...');
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
      formData.append('userId', data.userId);
      
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
        
        console.log('🔍 Adding profile image to FormData:', {
          uri: imageUri,
          name: filename,
          type: type,
        });
        
        // React Native FormData format - use the correct structure
        const imageFile = {
          uri: imageUri,
          type: type,
          name: filename,
        };
        
        console.log('🔍 Image file object:', imageFile);
        
        // React Native FormData requires the file object to be passed directly
        formData.append('profileImage', imageFile as any);
        console.log('✅ Image appended to FormData successfully');
        
        // Log FormData entries to verify
        console.log('🔍 FormData entries after adding image:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, typeof value === 'object' ? '[File Object]' : value);
        }
      } else {
        console.log('🔍 No profile image provided');
      }
      
      console.log('🔍 Sending FormData to API...');
      console.log('🔍 FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      const response = await apiClient.post('/professionals/register', formData);
      
      console.log('✅ Full response object:', response);
      console.log('✅ Response success:', response.success);
      console.log('✅ Response message:', response.message);
      
      // The apiClient already returns an ApiResponse object, not a raw axios response
      if (response && response.success) {
        console.log('✅ Registration successful:', response);
        return {
          success: true,
          message: response.message || 'Pharmacist registered successfully',
          data: response.data as PharmacistRegistrationResponse['data']
        };
      } else {
        console.log('❌ Registration failed:', response);
        return {
          success: false,
          message: response.message || 'Registration failed'
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
