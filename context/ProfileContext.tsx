import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { constructProfileImageUrl } from '../utils/imageUtils';

interface ProfileContextType {
  profileImage: string | null;
  updateProfileImage: (imageUri: string) => Promise<void>;
  clearProfileImage: () => Promise<void>;
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

  // Note: Profile image is now loaded by AuthContext when user logs in
  // This prevents conflicts between stored profile image and user data from database

  const updateProfileImage = async (imageUri: string) => {
    try {
      console.log('🔍 ProfileContext - updateProfileImage called with:', imageUri);
      // Ensure we store the full URL
      const fullImageUrl = constructProfileImageUrl(imageUri);
      console.log('🔍 ProfileContext - Constructed full URL:', fullImageUrl);
      
      setProfileImage(fullImageUrl);
      await AsyncStorage.setItem('profileImage', fullImageUrl);
      console.log('🔍 ProfileContext - Profile image updated and stored');
    } catch (error) {
      console.error('Error saving profile image:', error);
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

  return (
    <ProfileContext.Provider value={{
      profileImage,
      updateProfileImage,
      clearProfileImage,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}; 