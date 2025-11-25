import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authService, User, LoginCredentials, SignupData } from '../services/authService';
import { updateUserProfile as updateProfileAPI, uploadProfileImage } from '../services/profileService';
import { apiClient } from '../services/apiClient';
import { useProfile } from './ProfileContext';
import { constructProfileImageUrl } from '../utils/imageUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User }>;
  signup: (userData: SignupData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  firstTimeUser: boolean;
  markUserAsNotFirstTime: () => void;
  resetFirstTimeUser: () => void; // For testing purposes
  clearAllData: () => Promise<void>; // For testing purposes
  checkTokenExpiration: () => Promise<void>; // Check if token is expired
  testTokenExpiration: () => Promise<void>; // Manually trigger token expiration for testing
  updateUserProfile: (profileData: Partial<User>) => Promise<void>; // Update user profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstTimeUser, setFirstTimeUser] = useState(true);
  const { profileImage: profileImageUrl, updateProfileImage, clearProfileImage } = useProfile();

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
    
    // Set up token expiration callback
    apiClient.setTokenExpiredCallback(handleTokenExpired);
    
    console.log('🔍 AuthContext - Token expiration callback set up');
    
    // Set up periodic token expiration check (every 5 minutes)
    const tokenCheckInterval = setInterval(async () => {
      if (isAuthenticated) {
        await checkTokenExpiration();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const syncProfileImageToUser = async () => {
      setUser(prevUser => {
        if (!prevUser) return prevUser;
        
        const normalizedProfileImage = profileImageUrl || null;
        
        if (prevUser.profileImage === normalizedProfileImage) {
          return prevUser;
        }
        
        const updatedUser = { ...prevUser, profileImage: normalizedProfileImage };
        AsyncStorage.setItem('userData', JSON.stringify(updatedUser)).catch(error => {
          console.error('❌ AuthContext - Failed to persist updated user profile image:', error);
        });
        
        return updatedUser;
      });
    };
    
    syncProfileImageToUser();
  }, [profileImageUrl]);

  // Handle automatic logout when token expires
  const handleTokenExpired = async () => {
    console.log('🔍 AuthContext - Token expired, performing automatic logout');
    try {
      // Show user notification about automatic logout
      Alert.alert(
        'Session Expired',
        'Your session has expired for security reasons. Please log in again.',
        [{ text: 'OK', style: 'default' }],
        { cancelable: false }
      );
      
      // Clear all authentication data from storage
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
      
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true); // Reset to first time user after logout
      
      // Clear profile image from context and storage
      clearProfileImage();
      
      console.log('🔍 AuthContext - Automatic logout completed - all data cleared');
    } catch (error) {
      console.error('❌ AuthContext - Error during automatic logout:', error);
      // Even if there's an error, ensure local state is cleared
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true);
      clearProfileImage();
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const firstTimeFlag = await AsyncStorage.getItem('firstTimeUser');
      
      console.log('AuthContext - Stored data:', { token: !!token, userData: !!userData, firstTimeFlag });
      console.log('AuthContext - Raw values:', { token, userData, firstTimeFlag });
      
      // For demo/testing: Always show logo page first for new users
      // In production, you might want to check if this is a fresh app install
      if (token && userData && firstTimeFlag === 'false') {
        // User is authenticated and has been marked as not first time
        console.log('AuthContext - User is authenticated and returning');
        const parsedUserData = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(parsedUserData);
        setFirstTimeUser(false);
        
        // Load profile image if available
        if (parsedUserData.profileImage) {
          console.log('🔍 AuthContext - Loading profile image from stored data:', parsedUserData.profileImage);
          
          // Check if the stored profile image is already a full URL or malformed
          if (parsedUserData.profileImage.startsWith('http')) {
            // Already a full URL, use it directly
            console.log('🔍 AuthContext - Profile image is already a full URL:', parsedUserData.profileImage);
            updateProfileImage(parsedUserData.profileImage);
          } else {
            // Construct full URL for profile image
            const fullImageUrl = constructProfileImageUrl(parsedUserData.profileImage);
            console.log('🔍 AuthContext - Constructed full URL from stored data:', fullImageUrl);
            updateProfileImage(fullImageUrl);
          }
        } else {
          console.log('🔍 AuthContext - No profile image in stored user data');
        }
      } else {
        // User is new or hasn't completed onboarding
        console.log('AuthContext - User is first time or new');
        setFirstTimeUser(true);
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Default to first-time user on error
      setFirstTimeUser(true);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; user?: User }> => {
    try {
      setLoading(true);
      console.log('🔍 AuthContext - Starting login for:', email);
      console.log('🔍 AuthContext - Email received:', `"${email}"`);
      console.log('🔍 AuthContext - Password received:', `"${password}"`);
      console.log('🔍 AuthContext - Email type:', typeof email);
      console.log('🔍 AuthContext - Password type:', typeof password);
      
      // Use the auth service for real API call
      const credentials: LoginCredentials = { email, password };
      console.log('🔍 AuthContext - Credentials object:', credentials);
      const response = await authService.login(credentials);
      
      console.log('🔍 AuthContext - Login response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message
      });
      
      if (response.success && response.data) {
        console.log('🔍 AuthContext - Login successful, storing data...');
        console.log('🔍 AuthContext - User data:', {
          id: response.data.user.id,
          email: response.data.user.email,
          role: response.data.user.role
        });
        console.log('🔍 AuthContext - Token preview:', response.data.token ? `${response.data.token.substring(0, 20)}...` : 'No token');
        
        setIsAuthenticated(true);
        setUser(response.data.user);
        markUserAsNotFirstTime(); // User is not new after successful login
        
        // Debug: Log the entire user object to see what fields are available
        console.log('🔍 AuthContext - Full user object from login:', response.data.user);
        console.log('🔍 AuthContext - User object keys:', Object.keys(response.data.user));
        console.log('🔍 AuthContext - profileImage field value:', response.data.user.profileImage);
        console.log('🔍 AuthContext - profile_image field value:', (response.data.user as any).profile_image);
        
        // Load profile image if available
        if (response.data.user.profileImage) {
          console.log('🔍 AuthContext - Loading profile image on login:', response.data.user.profileImage);
          
          // Check if the profile image is already a full URL or malformed
          if (response.data.user.profileImage.startsWith('http')) {
            // Already a full URL, use it directly
            console.log('🔍 AuthContext - Profile image is already a full URL:', response.data.user.profileImage);
            updateProfileImage(response.data.user.profileImage);
          } else {
            // Construct full URL for profile image
            const fullImageUrl = constructProfileImageUrl(response.data.user.profileImage);
            console.log('🔍 AuthContext - Constructed full URL:', fullImageUrl);
            updateProfileImage(fullImageUrl);
          }
        } else if ((response.data.user as any).profile_image) {
          // Fallback: check for snake_case field name
          console.log('🔍 AuthContext - Found profile_image (snake_case):', (response.data.user as any).profile_image);
          
          // Check if the profile image is already a full URL or malformed
          if ((response.data.user as any).profile_image.startsWith('http')) {
            // Already a full URL, use it directly
            console.log('🔍 AuthContext - Profile image (snake_case) is already a full URL:', (response.data.user as any).profile_image);
            updateProfileImage((response.data.user as any).profile_image);
          } else {
            // Construct full URL for profile image
            const fullImageUrl = constructProfileImageUrl((response.data.user as any).profile_image);
            console.log('🔍 AuthContext - Constructed full URL from snake_case:', fullImageUrl);
            updateProfileImage(fullImageUrl);
          }
        } else {
          console.log('🔍 AuthContext - No profile image in login response (checked both camelCase and snake_case)');
        }
        
        return { success: true, user: response.data.user };
      } else {
        console.error('❌ AuthContext - Login failed:', response.message);
        return { success: false };
      }
    } catch (error) {
      console.error('❌ AuthContext - Login error:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: SignupData): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      
      // Use the auth service for real API call
      const response = await authService.signup(userData);
      
      if (response.success && response.data) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        markUserAsNotFirstTime(); // User is not new after successful signup
        return { success: true };
      } else {
        console.error('Signup failed:', response.message);
        return { 
          success: false, 
          message: response.message || 'Failed to create account. Please try again.' 
        };
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        message: error?.message || 'An error occurred during signup. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Use the auth service for real API call
      await authService.logout();
      
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true); // Reset to first time user after logout
      
      // Clear profile image from context and storage
      clearProfileImage();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true);
      
      // Clear profile image even on error
      clearProfileImage();
    } finally {
      setLoading(false);
    }
  };

  const markUserAsNotFirstTime = () => {
    setFirstTimeUser(false);
    AsyncStorage.setItem('firstTimeUser', 'false');
  };

  const resetFirstTimeUser = () => {
    setFirstTimeUser(true);
    AsyncStorage.setItem('firstTimeUser', 'true');
  };

  const clearAllData = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'firstTimeUser']);
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true);
      
      // Clear profile image from context and storage
      clearProfileImage();
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  };

  // Check if token is expired and logout if needed
  const checkTokenExpiration = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('🔍 No token found, user is not authenticated');
        return;
      }

      // Try to decode the token to check expiration
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('🔍 Invalid token format, logging out');
        await handleTokenExpired();
        return;
      }

      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < currentTime) {
          console.log('🔍 Token is expired, logging out');
          await handleTokenExpired();
        } else {
          console.log('🔍 Token is still valid');
        }
      } catch (decodeError) {
        console.error('❌ Error decoding token:', decodeError);
        await handleTokenExpired();
      }
    } catch (error) {
      console.error('❌ Error checking token expiration:', error);
    }
  };

  // Test token expiration functionality (for testing purposes)
  const testTokenExpiration = async (): Promise<void> => {
    console.log('🧪 Testing token expiration functionality...');
    try {
      // Show confirmation dialog
      Alert.alert(
        'Test Token Expiration',
        'This will simulate a token expiration and log you out. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Test', 
            style: 'destructive',
            onPress: async () => {
              console.log('🧪 User confirmed token expiration test');
              await handleTokenExpired();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error testing token expiration:', error);
    }
  };

  const updateUserProfile = async (profileData: Partial<User>): Promise<void> => {
    try {
      setLoading(true);
      
      console.log('🔍 AuthContext - Updating profile with data:', profileData);
      console.log('🔍 AuthContext - Current user:', user);
      
      // Call backend API to update profile
      const result = await updateProfileAPI({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        dateOfBirth: profileData.dateOfBirth,
        address: profileData.address,
      });
      
      console.log('🔍 AuthContext - ProfileService result:', result);
      
      if (!result.success) {
        console.error('❌ AuthContext - ProfileService failed:', result.message);
        throw new Error(result.message);
      }
      
      // Update user data in context with backend response
      if (user && result.data?.user) {
        const updatedUser = { ...user, ...result.data.user };
        setUser(updatedUser);
        
        // Store updated user data in AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        
        console.log('✅ Profile updated successfully via backend API');
      } else {
        console.log('⚠️ AuthContext - No user data in response, updating locally');
        // Fallback: update locally if no backend response
        const updatedUser = { ...user, ...profileData };
        setUser(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    signup,
    logout,
    loading,
    firstTimeUser,
    markUserAsNotFirstTime,
    resetFirstTimeUser,
    clearAllData,
    checkTokenExpiration,
    testTokenExpiration,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 