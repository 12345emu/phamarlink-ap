import React, { createContext, useContext, useState } from 'react';

type CartItem = { medicine: any; quantity: number };
type CartContextType = {
  cart: CartItem[];
  addToCart: (medicine: any) => void;
  removeFromCart: (medicineId: number) => void;
  updateQuantity: (medicineId: number, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (medicine: any) => {
    setCart((prev: CartItem[]) => {
      const existing = prev.find((item) => item.medicine.id === medicine.id);
      if (existing) {
        return prev.map((item) =>
          item.medicine.id === medicine.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { medicine, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (medicineId: number) => {
    setCart((prev: CartItem[]) => prev.filter((item) => item.medicine.id !== medicineId));
  };

  const updateQuantity = (medicineId: number, quantity: number) => {
    setCart((prev: CartItem[]) =>
      prev.map((item) =>
        item.medicine.id === medicineId
          ? { ...item, quantity }
          : item
      ).filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
} 