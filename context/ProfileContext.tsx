import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { constructProfileImageUrl, testImageUrlAccess } from '../utils/imageUtils';
import { uploadProfileImage } from '../services/profileService';

interface ProfileContextType {
  profileImage: string | null;
  updateProfileImage: (imageUri: string) => Promise<void>;
  clearProfileImage: () => Promise<void>;
  refreshProfileImage: () => Promise<void>;
  clearMalformedImages: () => Promise<void>;
  testCurrentImageUrl: () => Promise<void>;
  forceRefreshFromBackend: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  console.log('🔍 ProfileProvider - Initialized with profileImage:', profileImage);

  // Debug profileImage state changes
  useEffect(() => {
    console.log('🔍 ProfileContext - profileImage state changed to:', profileImage);
  }, [profileImage]);

  // Function to clear malformed images
  const clearMalformedImages = async () => {
    try {
      console.log('🔍 ProfileContext - clearMalformedImages called');
      const storedImage = await AsyncStorage.getItem('profileImage');
      
      if (storedImage) {
        // Check for malformed URLs that combine file:// and http
        if (storedImage.includes('file://') && storedImage.startsWith('http')) {
          console.warn('❌ ProfileContext - Clearing malformed URL:', storedImage);
          await AsyncStorage.removeItem('profileImage');
          setProfileImage(null);
          return;
        }
        
        // Only clear local file URIs if they're not valid network URLs
        if (storedImage.startsWith('file://') && !storedImage.startsWith('http')) {
          console.warn('❌ ProfileContext - Clearing local file URI:', storedImage);
          await AsyncStorage.removeItem('profileImage');
          setProfileImage(null);
          return;
        }
        
        console.log('✅ ProfileContext - Stored image is valid:', storedImage);
      } else {
        console.log('🔍 ProfileContext - No stored image to check');
      }
    } catch (error) {
      console.error('Error clearing malformed images:', error);
    }
  };

  // Load profile image from AsyncStorage on initialization
  useEffect(() => {
    const loadStoredProfileImage = async () => {
      try {
        console.log('🔍 ProfileContext - Loading stored profile image from AsyncStorage...');
        
        // First, clear any malformed images
        await clearMalformedImages();
        
        const storedImage = await AsyncStorage.getItem('profileImage');
        console.log('🔍 ProfileContext - Retrieved from AsyncStorage:', storedImage);
        
        if (storedImage) {
          console.log('🔍 ProfileContext - Loading stored profile image:', storedImage);
          
          // Check if the stored image is malformed (combines file:// and http)
          if (storedImage.includes('file://') && storedImage.startsWith('http')) {
            console.warn('❌ ProfileContext - Malformed URL detected in storage, clearing it:', storedImage);
            await AsyncStorage.removeItem('profileImage');
            setProfileImage(null);
            return;
          }
          
          // Only clear local file URIs if they're not valid network URLs
          if (storedImage.startsWith('file://') && !storedImage.startsWith('http')) {
            console.warn('❌ ProfileContext - Local file URI detected in storage, clearing it:', storedImage);
            await AsyncStorage.removeItem('profileImage');
            setProfileImage(null);
            return;
          }
          
          setProfileImage(storedImage);
          console.log('✅ ProfileContext - Set profileImage state to:', storedImage);
        } else {
          console.log('🔍 ProfileContext - No stored profile image found');
        }
      } catch (error) {
        console.error('❌ ProfileContext - Error loading stored profile image:', error);
      }
    };

    loadStoredProfileImage();
  }, []);

  // Note: Profile image is also loaded by AuthContext when user logs in
  // This provides a fallback and ensures consistency

  const updateProfileImage = async (imageUri: string) => {
    try {
      console.log('🔍 ProfileContext - updateProfileImage called with:', imageUri);
      console.log('🔍 ProfileContext - Current profileImage state:', profileImage);
      
      // If imageUri is already a full URL (from login), just store it directly
      if (imageUri.startsWith('http')) {
        console.log('🔍 ProfileContext - ImageUri is already a full URL, storing directly:', imageUri);
        setProfileImage(imageUri);
        await AsyncStorage.setItem('profileImage', imageUri);
        console.log('✅ ProfileContext - Stored full URL directly:', imageUri);
        return;
      }
      
      // Upload image to backend (for new uploads)
      const result = await uploadProfileImage(imageUri);
      
      console.log('🔍 ProfileContext - Upload result:', result);
      
      if (!result.success) {
        console.error('❌ ProfileContext - Upload failed:', result.message);
        throw new Error(result.message);
      }
      
      // Get the uploaded image URL from backend response
      const uploadedImageUrl = result.data?.profileImage || result.data?.user?.profileImage;
      console.log('🔍 ProfileContext - Backend response data:', result.data);
      console.log('🔍 ProfileContext - Extracted uploadedImageUrl:', uploadedImageUrl);
      console.log('🔍 ProfileContext - ImageUri (original):', imageUri);
      
      // Check if the uploadedImageUrl is valid
      if (!uploadedImageUrl) {
        console.warn('⚠️ ProfileContext - No image URL from backend, upload may have failed');
        throw new Error('Backend did not return a valid image URL');
      }
      
      // Check if the backend returned a valid path (starts with /uploads/)
      if (uploadedImageUrl.startsWith('/uploads/')) {
        console.log('✅ ProfileContext - Backend returned valid upload path:', uploadedImageUrl);
      } else {
        console.warn('⚠️ ProfileContext - Backend returned unexpected URL format:', uploadedImageUrl);
      }
      
      const fullImageUrl = constructProfileImageUrl(uploadedImageUrl);
      console.log('🔍 ProfileContext - Backend uploaded URL:', fullImageUrl);
      
      console.log('🔍 ProfileContext - About to set profileImage to:', fullImageUrl);
      setProfileImage(fullImageUrl);
      await AsyncStorage.setItem('profileImage', fullImageUrl);
      console.log('✅ ProfileContext - Profile image uploaded to backend and stored locally');
      console.log('✅ ProfileContext - Updated profileImage state to:', fullImageUrl);
      console.log('✅ ProfileContext - Stored in AsyncStorage as:', fullImageUrl);
    } catch (error) {
      console.error('❌ Error uploading profile image to backend:', error);
      console.error('❌ Error details:', error);
      
      // Fallback to local storage if backend upload fails
      // For local file URIs, don't try to construct a network URL
      if (imageUri.startsWith('file://')) {
        console.log('🔍 ProfileContext - Fallback: Setting profileImage to file URI:', imageUri);
        setProfileImage(imageUri);
        await AsyncStorage.setItem('profileImage', imageUri);
        console.log('⚠️ ProfileContext - Fallback to local storage with file URI:', imageUri);
        console.log('⚠️ ProfileContext - Updated profileImage state to:', imageUri);
      } else {
        const fullImageUrl = constructProfileImageUrl(imageUri);
        console.log('🔍 ProfileContext - Fallback: Setting profileImage to constructed URL:', fullImageUrl);
        setProfileImage(fullImageUrl);
        await AsyncStorage.setItem('profileImage', fullImageUrl);
        console.log('⚠️ ProfileContext - Fallback to local storage with constructed URL:', fullImageUrl);
        console.log('⚠️ ProfileContext - Updated profileImage state to:', fullImageUrl);
      }
      
      // You might want to show an alert to the user about the fallback
      // Alert.alert('Upload Failed', 'Image saved locally. Upload failed.');
    }
  };

  const clearProfileImage = async () => {
    try {
      console.log('🔍 ProfileContext - clearProfileImage called');
      setProfileImage(null);
      await AsyncStorage.removeItem('profileImage');
      console.log('🔍 ProfileContext - Profile image cleared');
    } catch (error) {
      console.error('Error clearing profile image:', error);
    }
  };

  const refreshProfileImage = async () => {
    try {
      console.log('🔍 ProfileContext - refreshProfileImage called');
      const storedImage = await AsyncStorage.getItem('profileImage');
      if (storedImage) {
        console.log('🔍 ProfileContext - Refreshing with stored image:', storedImage);
        setProfileImage(storedImage);
      } else {
        console.log('🔍 ProfileContext - No stored image to refresh');
        setProfileImage(null);
      }
    } catch (error) {
      console.error('Error refreshing profile image:', error);
    }
  };

  const testCurrentImageUrl = async () => {
    try {
      console.log('🔍 ProfileContext - testCurrentImageUrl called');
      if (profileImage) {
        console.log('🔍 ProfileContext - Testing current profile image URL:', profileImage);
        const isAccessible = await testImageUrlAccess(profileImage);
        console.log(`🔍 ProfileContext - Image URL is ${isAccessible ? 'accessible' : 'not accessible'}`);
      } else {
        console.log('🔍 ProfileContext - No profile image to test');
      }
    } catch (error) {
      console.error('Error testing image URL:', error);
    }
  };

  const forceRefreshFromBackend = async () => {
    try {
      console.log('🔍 ProfileContext - forceRefreshFromBackend called');
      // Clear current profile image
      setProfileImage(null);
      await AsyncStorage.removeItem('profileImage');
      console.log('🔍 ProfileContext - Cleared current profile image');
      
      // The AuthContext should reload the profile image on next login
      // or we could trigger a profile refresh here
      console.log('🔍 ProfileContext - Profile image cleared, will be reloaded on next login');
    } catch (error) {
      console.error('Error forcing refresh from backend:', error);
    }
  };

  return (
    <ProfileContext.Provider value={{
      profileImage,
      updateProfileImage,
      clearProfileImage,
      refreshProfileImage,
      clearMalformedImages,
      testCurrentImageUrl,
      forceRefreshFromBackend
    }}>
      {children}
    </ProfileContext.Provider>
  );
}; 