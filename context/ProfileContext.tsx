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
  profileImageUpdateCallback: (() => void) | null;
  setProfileImageUpdateCallback: (callback: (() => void) | null) => void;
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
  const [profileImageUpdateCallback, setProfileImageUpdateCallback] = useState<(() => void) | null>(null);
  
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

  const persistProfileImage = async (imageUrl: string) => {
    console.log('🔍 ProfileContext - Persisting profile image URL:', imageUrl);
    setProfileImage(imageUrl);
    await AsyncStorage.setItem('profileImage', imageUrl);
    
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const updatedUser = { ...parsedUser, profileImage: imageUrl };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      }
    } catch (persistError) {
      console.error('⚠️ ProfileContext - Failed to persist profile image to user data:', persistError);
    }
  };

  const updateProfileImage = async (imageUri: string) => {
    try {
      console.log('🔍 ProfileContext - updateProfileImage called with:', imageUri);
      console.log('🔍 ProfileContext - Current profileImage state:', profileImage);

      const extractProfileUrl = (data: any): string | null => {
        if (!data) return null;
        if (typeof data === 'string') return data;
        if (data.profileImage) return data.profileImage;
        if (data.user?.profileImage) return data.user.profileImage;
        if (data.data) return extractProfileUrl(data.data);
        return null;
      };
      
      const isRemoteAsset = imageUri.startsWith('http');
      const isServerPath = imageUri.startsWith('/uploads/');
      const isLocalFile = imageUri.startsWith('file://');
      
      if (isRemoteAsset || isServerPath) {
        const normalizedUrl = isRemoteAsset ? imageUri : (constructProfileImageUrl(imageUri) || imageUri);
        if (!normalizedUrl) {
          throw new Error('Invalid image URL provided');
        }
        console.log('🔍 ProfileContext - ImageUri already points to server asset, storing directly:', normalizedUrl);
        await persistProfileImage(normalizedUrl);
        
        if (profileImageUpdateCallback) {
          profileImageUpdateCallback();
        }
        return;
      }
      
      if (!isLocalFile) {
        throw new Error('Invalid image source');
      }
      
      // Upload image to backend (for new uploads)
      const result = await uploadProfileImage(imageUri);
      
      console.log('🔍 ProfileContext - Upload result:', result);
      
      if (!result.success) {
        console.error('❌ ProfileContext - Upload failed:', result.message);
        throw new Error(result.message);
      }
      
      // Get the uploaded image URL from backend response
      const uploadedImageUrl = extractProfileUrl(result.data);
      console.log('🔍 ProfileContext - Backend response data:', result.data);
      console.log('🔍 ProfileContext - Extracted uploadedImageUrl:', uploadedImageUrl);
      console.log('🔍 ProfileContext - ImageUri (original):', imageUri);
      
      // Check if the uploadedImageUrl is valid
      if (!uploadedImageUrl) {
        console.warn('⚠️ ProfileContext - No image URL from backend, upload may have failed');
        throw new Error('Backend did not return a valid image URL');
      }
      
      const normalizedUploadedUrl = uploadedImageUrl as string;
      
      // Check if the backend returned a valid path (starts with /uploads/)
      if (normalizedUploadedUrl.startsWith('/uploads/')) {
        console.log('✅ ProfileContext - Backend returned valid upload path:', normalizedUploadedUrl);
      } else if (normalizedUploadedUrl.startsWith('http')) {
        console.log('✅ ProfileContext - Backend returned absolute URL:', normalizedUploadedUrl);
      } else {
        console.warn('⚠️ ProfileContext - Backend returned unexpected URL format:', normalizedUploadedUrl);
      }
      
      const constructedUrl = constructProfileImageUrl(normalizedUploadedUrl);
      const finalUrl = constructedUrl || normalizedUploadedUrl;
      console.log('🔍 ProfileContext - Backend uploaded URL:', finalUrl);
      
      console.log('🔍 ProfileContext - About to set profileImage to:', finalUrl);
      await persistProfileImage(finalUrl);
      console.log('✅ ProfileContext - Profile image uploaded to backend and stored locally');
      console.log('✅ ProfileContext - Updated profileImage state to:', finalUrl);
      console.log('✅ ProfileContext - Stored in AsyncStorage as:', finalUrl);
      
      // Call the callback to notify components of the update
      if (profileImageUpdateCallback) {
        console.log('🔍 ProfileContext - Calling profileImageUpdateCallback');
        profileImageUpdateCallback();
      } else {
        console.warn('⚠️ ProfileContext - No profileImageUpdateCallback registered');
      }
    } catch (error) {
      console.error('❌ Error uploading profile image to backend:', error);
      console.error('❌ Error details:', error);
      throw error;
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
      forceRefreshFromBackend,
      profileImageUpdateCallback,
      setProfileImageUpdateCallback
    }}>
      {children}
    </ProfileContext.Provider>
  );
}; 