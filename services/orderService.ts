import { apiClient, ApiResponse } from './apiClient';

export interface OrderItem {
  id: number;
  order_id: number;
  medicine_id: number;
  pharmacy_medicine_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  medicine_name: string;
  generic_name: string;
  dosage_form: string;
  strength: string;
  prescription_required: number;
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
  order_number: string;
  patient_id: number;
  pharmacy_id: number;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  delivery_address: string;
  delivery_instructions?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  pharmacy: {
    id: number;
    name: string;
    address: string;
    phone: string;
  };
  // Customer information (from users table)
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
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