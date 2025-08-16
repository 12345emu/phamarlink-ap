import { apiClient, ApiResponse } from './apiClient';

export interface CartItem {
  id: number;
  medicine: {
    id: number;
    name: string;
    genericName?: string;
    brandName?: string;
    description?: string;
    category?: string;
    prescriptionRequired: boolean;
    dosageForm?: string;
    strength?: string;
    manufacturer?: string;
    image?: string;
  };
  pharmacy: {
    id: number;
    name: string;
    address: string;
    city: string;
  };
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface AddToCartData {
  medicineId: number;
  pharmacyId: number;
  quantity: number;
  pricePerUnit: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

class CartService {
  // Get user's cart
  async getCart(): Promise<ApiResponse<CartItem[]>> {
    try {
      const response = await apiClient.get<CartItem[]>('/cart');
      return response;
    } catch (error) {
      console.error('Error fetching cart:', error);
      return {
        success: false,
        message: 'Failed to fetch cart items'
      };
    }
  }

  // Add item to cart
  async addToCart(data: AddToCartData): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>('/cart/add', data);
      return response;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        message: 'Failed to add item to cart'
      };
    }
  }

  // Update cart item quantity
  async updateCartItem(itemId: number, data: UpdateCartItemData): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put<any>(`/cart/update/${itemId}`, data);
      return response;
    } catch (error) {
      console.error('Error updating cart item:', error);
      return {
        success: false,
        message: 'Failed to update cart item'
      };
    }
  }

  // Remove item from cart
  async removeFromCart(itemId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete<any>(`/cart/remove/${itemId}`);
      return response;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        message: 'Failed to remove item from cart'
      };
    }
  }

  // Clear user's cart (after successful checkout)
  async clearCart(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete<any>('/cart/clear');
      return response;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        message: 'Failed to clear cart'
      };
    }
  }
}

export const cartService = new CartService(); 