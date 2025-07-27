import React from 'react';
import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext';
import { OrdersProvider } from '../context/OrdersContext';
import { AppointmentsProvider } from '../context/AppointmentsContext';
import { ProfileProvider } from '../context/ProfileContext';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <AppointmentsProvider>
        <OrdersProvider>
          <CartProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                      <Stack.Screen name="pharmacy-details-modal" options={{ headerShown: false }} />
                        <Stack.Screen name="hospital-details-modal" options={{ headerShown: false }} />
                        <Stack.Screen name="pharmacy-registration" options={{ headerShown: false }} />
                        <Stack.Screen name="hospital-registration" options={{ headerShown: false }} />
                        <Stack.Screen name="pharmacist-registration" options={{ headerShown: false }} />
                        <Stack.Screen name="doctor-registration" options={{ headerShown: false }} />
                        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </CartProvider>
        </OrdersProvider>
      </AppointmentsProvider>
    </ProfileProvider>
  );
}
