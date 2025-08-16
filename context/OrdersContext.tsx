import React, { createContext, useContext, useState, useEffect } from 'react';
import { orderService, Order, CreateOrderData } from '../services/orderService';
import { useAuth } from './AuthContext';

type OrdersContextType = {
  orders: Order[];
  loading: boolean;
  addOrder: (orderData: CreateOrderData) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: number) => Promise<boolean>;
};

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load orders from database when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshOrders();
    } else {
      setOrders([]);
    }
  }, [isAuthenticated]);

  const refreshOrders = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await orderService.getOrders();
      if (response.success && response.data) {
        setOrders(response.data.orders);
      } else {
        console.error('Failed to load orders:', response.message);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const addOrder = async (orderData: CreateOrderData): Promise<boolean> => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to create orders');
      return false;
    }

    try {
      setLoading(true);
      const response = await orderService.createOrder(orderData);
      if (response.success) {
        // Refresh orders to get updated data
        await refreshOrders();
        return true;
      } else {
        console.error('Failed to create order:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: number): Promise<boolean> => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to cancel orders');
      return false;
    }

    try {
      const response = await orderService.cancelOrder(orderId);
      if (response.success) {
        // Refresh orders to get updated data
        await refreshOrders();
        return true;
      } else {
        console.error('Failed to cancel order:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  };

  return (
    <OrdersContext.Provider value={{ orders, loading, addOrder, refreshOrders, cancelOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within an OrdersProvider');
  return ctx;
} 