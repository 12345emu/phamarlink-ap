import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User, LoginCredentials, SignupData } from '../services/authService';

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

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

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
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
        setFirstTimeUser(false);
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
      
      // Use the auth service for real API call
      const credentials: LoginCredentials = { email, password };
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        setFirstTimeUser(false); // User is not new after successful login
        return true;
      } else {
        console.error('Login failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
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
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true);
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
    } catch (error) {
      console.error('Error clearing all data:', error);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 