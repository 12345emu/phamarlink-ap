import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: any) => Promise<boolean>;
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
  const [user, setUser] = useState<any | null>(null);
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
      
      // Simulate API call - in real app, this would be an actual API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any email/password combination
      if (email && password) {
        const userData = {
          id: '1',
          email,
          name: email.split('@')[0], // Use email prefix as name for demo
          userType: 'patient'
        };
        
        // Store authentication data
        await AsyncStorage.setItem('userToken', 'demo-token-123');
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        setIsAuthenticated(true);
        setUser(userData);
        setFirstTimeUser(false); // User is not new after successful login
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: any): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Simulate API call - in real app, this would be an actual API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, create a user account
      const newUser = {
        id: Date.now().toString(),
        email: userData.email,
        name: userData.fullName,
        userType: userData.selectedUserType,
        phone: userData.phone
      };
      
      // Store authentication data
      await AsyncStorage.setItem('userToken', 'demo-token-123');
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      
      setIsAuthenticated(true);
      setUser(newUser);
      setFirstTimeUser(false); // User is not new after successful signup
      return true;
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
      
      // Clear authentication data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true); // Reset firstTimeUser on logout
    } catch (error) {
      console.error('Logout error:', error);
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
    AsyncStorage.removeItem('firstTimeUser');
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'firstTimeUser']);
      setIsAuthenticated(false);
      setUser(null);
      setFirstTimeUser(true);
      setLoading(false);
    } catch (error) {
      console.error('Error clearing data:', error);
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
    clearAllData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 