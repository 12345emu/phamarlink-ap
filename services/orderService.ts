import { apiClient, ApiResponse } from './apiClient';

export interface OrderItem {
  medicineId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateOrderData {
  pharmacyId: number;
  items: OrderItem[];
  deliveryAddress: string;
  paymentMethod: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  deliveryInstructions?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  patientId: number;
  pharmacyId: number;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  pharmacy: {
    id: number;
    name: string;
    address: string;
    phone: string;
  };
}

class OrderService {
  // Create a new order
  async createOrder(data: CreateOrderData): Promise<ApiResponse<Order>> {
    try {
      const response = await apiClient.post<Order>('/orders', data);
      return response;
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        message: 'Failed to create order'
      };
    }
  }

  // Get user's orders
  async getOrders(page: number = 1, limit: number = 20): Promise<ApiResponse<{ orders: Order[], pagination: any }>> {
    try {
      const response = await apiClient.get<{ orders: Order[], pagination: any }>(`/orders?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        success: false,
        message: 'Failed to fetch orders'
      };
    }
  }

  // Get a specific order by ID
  async getOrder(orderId: number): Promise<ApiResponse<Order>> {
    try {
      const response = await apiClient.get<Order>(`/orders/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error fetching order:', error);
      return {
        success: false,
        message: 'Failed to fetch order'
      };
    }
  }

  // Cancel an order
  async cancelOrder(orderId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put<any>(`/orders/${orderId}/cancel`);
      return response;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        message: 'Failed to cancel order'
      };
    }
  }
}

export const orderService = new OrderService(); 