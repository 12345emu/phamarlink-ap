import React, { createContext, useContext, useState } from 'react';

type Order = {
  id: string;
  items: { medicine: any; quantity: number }[];
  address: string;
  paymentMethod: string;
  total: number;
  date: string;
};

type OrdersContextType = {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date'>) => void;
};

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (order: Omit<Order, 'id' | 'date'>) => {
    setOrders(prev => [ 
      {
        ...order,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within an OrdersProvider');
  return ctx;
} 