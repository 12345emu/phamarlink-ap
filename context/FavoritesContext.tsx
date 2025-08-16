import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface FavoriteFacility {
  id: string;
  name: string;
  type: 'pharmacy' | 'hospital' | 'clinic';
  address: {
    street: string;
    city: string;
    state: string;
  };
  phone: string;
  rating: number;
  distance?: number;
  image?: string;
  addedAt: string;
}

interface FavoritesContextType {
  favorites: FavoriteFacility[];
  loading: boolean;
  error: string | null;
  addFavorite: (facility: Omit<FavoriteFacility, 'addedAt'>) => Promise<void>;
  removeFavorite: (facilityId: string) => Promise<void>;
  toggleFavorite: (facility: Omit<FavoriteFacility, 'addedAt'>) => Promise<void>;
  isFavorite: (facilityId: string) => boolean;
  clearFavorites: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Load favorites from AsyncStorage
  const loadFavorites = async () => {
    if (!isAuthenticated || !user) {
      setFavorites([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const storageKey = `favorites_${user.id}`;
      const storedFavorites = await AsyncStorage.getItem(storageKey);
      
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites);
        setFavorites(parsedFavorites);
        console.log('✅ Favorites loaded:', parsedFavorites.length);
      } else {
        setFavorites([]);
        console.log('📝 No stored favorites found');
      }
    } catch (error: any) {
      console.error('❌ Error loading favorites:', error);
      setError(error.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  // Save favorites to AsyncStorage
  const saveFavorites = async (newFavorites: FavoriteFacility[]) => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      const storageKey = `favorites_${user.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(newFavorites));
      console.log('✅ Favorites saved:', newFavorites.length);
    } catch (error: any) {
      console.error('❌ Error saving favorites:', error);
      setError(error.message || 'Failed to save favorites');
    }
  };

  // Add a facility to favorites
  const addFavorite = async (facility: Omit<FavoriteFacility, 'addedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const newFavorite: FavoriteFacility = {
        ...facility,
        addedAt: new Date().toISOString(),
      };
      
      const updatedFavorites = [...favorites, newFavorite];
      setFavorites(updatedFavorites);
      await saveFavorites(updatedFavorites);
      
      console.log('✅ Added to favorites:', facility.name);
    } catch (error: any) {
      console.error('❌ Error adding favorite:', error);
      setError(error.message || 'Failed to add favorite');
    } finally {
      setLoading(false);
    }
  };

  // Remove a facility from favorites
  const removeFavorite = async (facilityId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedFavorites = favorites.filter(fav => fav.id !== facilityId);
      setFavorites(updatedFavorites);
      await saveFavorites(updatedFavorites);
      
      console.log('✅ Removed from favorites:', facilityId);
    } catch (error: any) {
      console.error('❌ Error removing favorite:', error);
      setError(error.message || 'Failed to remove favorite');
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (facility: Omit<FavoriteFacility, 'addedAt'>) => {
    try {
      const isCurrentlyFavorite = favorites.some(fav => fav.id === facility.id);
      
      if (isCurrentlyFavorite) {
        await removeFavorite(facility.id);
      } else {
        await addFavorite(facility);
      }
    } catch (error: any) {
      console.error('❌ Error toggling favorite:', error);
      setError(error.message || 'Failed to toggle favorite');
    }
  };

  // Check if a facility is favorited
  const isFavorite = (facilityId: string): boolean => {
    return favorites.some(fav => fav.id === facilityId);
  };

  // Clear all favorites
  const clearFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      setFavorites([]);
      await saveFavorites([]);
      
      console.log('✅ All favorites cleared');
    } catch (error: any) {
      console.error('❌ Error clearing favorites:', error);
      setError(error.message || 'Failed to clear favorites');
    } finally {
      setLoading(false);
    }
  };

  // Refresh favorites
  const refreshFavorites = async () => {
    await loadFavorites();
  };

  // Load favorites when user changes
  useEffect(() => {
    loadFavorites();
  }, [isAuthenticated, user]);

  const value: FavoritesContextType = {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}; 