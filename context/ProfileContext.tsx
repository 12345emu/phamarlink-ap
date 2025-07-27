import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileContextType {
  profileImage: string | null;
  updateProfileImage: (imageUri: string) => void;
  clearProfileImage: () => void;
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

  const updateProfileImage = (imageUri: string) => {
    setProfileImage(imageUri);
  };

  const clearProfileImage = () => {
    setProfileImage(null);
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