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
  // Initialize with sample orders to match the orders page
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "ORD-2024-001",
      items: [
        { medicine: { id: 1, name: "Paracetamol 500mg", price: 10.99, image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" }, quantity: 2 },
        { medicine: { id: 2, name: "Vitamin C 500mg", price: 12.00, image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 3, name: "Ibuprofen 400mg", price: 13.00, image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      address: "123 Main St, Accra",
      paymentMethod: "card",
      total: 45.99,
      date: "2024-01-15"
    },
    {
      id: "ORD-2024-002",
      items: [
        { medicine: { id: 4, name: "Amoxicillin 250mg", price: 25.00, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 5, name: "Bandages", price: 3.50, image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      address: "456 Oak Ave, Accra",
      paymentMethod: "mobile",
      total: 28.50,
      date: "2024-01-14"
    },
    {
      id: "ORD-2024-003",
      items: [
        { medicine: { id: 6, name: "Vitamin D3 1000IU", price: 20.00, image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" }, quantity: 2 },
        { medicine: { id: 7, name: "Iron Supplements", price: 18.00, image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 8, name: "Pain Relief Gel", price: 11.25, image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      address: "789 Pine St, Accra",
      paymentMethod: "card",
      total: 67.25,
      date: "2024-01-13"
    },
    {
      id: "ORD-2024-004",
      items: [
        { medicine: { id: 9, name: "Aspirin 100mg", price: 8.00, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 10, name: "Antiseptic Solution", price: 7.99, image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      address: "321 Elm St, Accra",
      paymentMethod: "cash",
      total: 15.99,
      date: "2024-01-12"
    }
  ]);

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