import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User, LoginCredentials, SignupData } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { useProfile } from './ProfileContext';
import { constructProfileImageUrl } from '../utils/imageUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  firstTimeUser: boolean;
  markUserAsNotFirstTime: () => void;
  resetFirstTimeUser: () => void; // For testing purposes
  clearAllData: () => Promise<void>; // For testing purposes
  checkTokenExpiration: () => Promise<void>; // Check if token is expired
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
  const { updateProfileImage, clearProfileImage } = useProfile();

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

  // Handle automatic logout when token expires
  const handleTokenExpired = async () => {
    console.log('🔍 AuthContext - Token expired, performing automatic logout');
    try {
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true); // Reset to first time user after logout
      
      // Clear profile image from context and storage
      clearProfileImage();
      
      console.log('🔍 AuthContext - Automatic logout completed');
    } catch (error) {
      console.error('❌ AuthContext - Error during automatic logout:', error);
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
          // Construct full URL for profile image
          const fullImageUrl = constructProfileImageUrl(parsedUserData.profileImage);
          console.log('🔍 AuthContext - Constructed full URL from stored data:', fullImageUrl);
          updateProfileImage(fullImageUrl);
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔍 AuthContext - Starting login for:', email);
      
      // Use the auth service for real API call
      const credentials: LoginCredentials = { email, password };
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
        setFirstTimeUser(false); // User is not new after successful login
        
        // Debug: Log the entire user object to see what fields are available
        console.log('🔍 AuthContext - Full user object from login:', response.data.user);
        console.log('🔍 AuthContext - User object keys:', Object.keys(response.data.user));
        console.log('🔍 AuthContext - profileImage field value:', response.data.user.profileImage);
        console.log('🔍 AuthContext - profile_image field value:', (response.data.user as any).profile_image);
        
        // Load profile image if available
        if (response.data.user.profileImage) {
          console.log('🔍 AuthContext - Loading profile image on login:', response.data.user.profileImage);
          // Construct full URL for profile image
          const fullImageUrl = constructProfileImageUrl(response.data.user.profileImage);
          console.log('🔍 AuthContext - Constructed full URL:', fullImageUrl);
          updateProfileImage(fullImageUrl);
        } else if ((response.data.user as any).profile_image) {
          // Fallback: check for snake_case field name
          console.log('🔍 AuthContext - Found profile_image (snake_case):', (response.data.user as any).profile_image);
          const fullImageUrl = constructProfileImageUrl((response.data.user as any).profile_image);
          console.log('🔍 AuthContext - Constructed full URL from snake_case:', fullImageUrl);
          updateProfileImage(fullImageUrl);
        } else {
          console.log('🔍 AuthContext - No profile image in login response (checked both camelCase and snake_case)');
        }
        
        return true;
      } else {
        console.error('❌ AuthContext - Login failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ AuthContext - Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Use the auth service for real API call
      const response = await authService.signup(userData);
      
      if (response.success && response.data) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        setFirstTimeUser(false); // User is not new after successful signup
        return true;
      } else {
        console.error('Signup failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Signup error:', error);
      return false;
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 