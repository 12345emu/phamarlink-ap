import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartService, CartItem, AddToCartData } from '../services/cartService';
import { useAuth } from './AuthContext';

type CartContextType = {
  cart: CartItem[];
  loading: boolean;
  addToCart: (medicine: any, pharmacyId: number, pricePerUnit: number, quantity?: number) => Promise<boolean>;
  removeFromCart: (itemId: number) => Promise<boolean>;
  updateQuantity: (itemId: number, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load cart from database when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setCart([]);
    }
  }, [isAuthenticated]);

  const refreshCart = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await cartService.getCart();
      if (response.success && response.data) {
        setCart(response.data);
      } else {
        console.error('Failed to load cart:', response.message);
        setCart([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (medicine: any, pharmacyId: number, pricePerUnit: number, quantity: number = 1): Promise<boolean> => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to add items to cart');
      return false;
    }

    try {
      const cartData: AddToCartData = {
        medicineId: medicine.id,
        pharmacyId,
        quantity,
        pricePerUnit
      };

      const response = await cartService.addToCart(cartData);
      if (response.success) {
        // Refresh cart to get updated data
        await refreshCart();
        return true;
      } else {
        console.error('Failed to add to cart:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  };

  const removeFromCart = async (itemId: number): Promise<boolean> => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to remove items from cart');
      return false;
    }

    try {
      const response = await cartService.removeFromCart(itemId);
      if (response.success) {
        // Refresh cart to get updated data
        await refreshCart();
        return true;
      } else {
        console.error('Failed to remove from cart:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  };

  const updateQuantity = async (itemId: number, quantity: number): Promise<boolean> => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to update cart');
      return false;
    }

    try {
      const response = await cartService.updateCartItem(itemId, { quantity });
      if (response.success) {
        // Refresh cart to get updated data
        await refreshCart();
        return true;
      } else {
        console.error('Failed to update cart item:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      return false;
    }
  };

  const clearCart = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to clear cart');
      return false;
    }

    try {
      const response = await cartService.clearCart();
      if (response.success) {
        setCart([]);
        return true;
      } else {
        console.error('Failed to clear cart:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      loading, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      refreshCart 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
} 