import React from 'react';
import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext';
import { OrdersProvider } from '../context/OrdersContext';

export default function RootLayout() {
  return (
    <OrdersProvider>
      <CartProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacy-details-modal" options={{ headerShown: false }} />
          <Stack.Screen name="hospital-details-modal" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </CartProvider>
    </OrdersProvider>
  );
}
