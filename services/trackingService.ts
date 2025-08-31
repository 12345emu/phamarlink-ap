import { apiClient, ApiResponse } from './apiClient';

export interface TrackingEntry {
  id: number;
  order_id: number;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  tracking_number: string;
}

export interface OrderTracking {
  order: {
    id: number;
    order_number: string;
    status: string;
    created_at: string;
    estimated_delivery?: string;
    delivery_address: string;
  };
  tracking: TrackingEntry[];
  tracking_number: string;
}

export interface UpdateTrackingData {
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  description?: string;
  location?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
}

class TrackingService {
  // Get tracking information by order ID
  async getTrackingByOrderId(orderId: number): Promise<ApiResponse<OrderTracking>> {
    try {
      const response = await apiClient.get<OrderTracking>(`/tracking/order/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error fetching tracking by order ID:', error);
      return {
        success: false,
        message: 'Failed to fetch tracking information'
      };
    }
  }

  // Get tracking information by tracking number
  async getTrackingByNumber(trackingNumber: string): Promise<ApiResponse<OrderTracking>> {
    try {
      const response = await apiClient.get<OrderTracking>(`/tracking/number/${trackingNumber}`);
      return response;
    } catch (error) {
      console.error('Error fetching tracking by number:', error);
      return {
        success: false,
        message: 'Failed to fetch tracking information'
      };
    }
  }

  // Update tracking status (for pharmacists/admin)
  async updateTracking(orderId: number, data: UpdateTrackingData): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>(`/tracking/update/${orderId}`, data);
      return response;
    } catch (error) {
      console.error('Error updating tracking:', error);
      return {
        success: false,
        message: 'Failed to update tracking'
      };
    }
  }
}

export const trackingService = new TrackingService();