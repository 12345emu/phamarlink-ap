import React from 'react';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { CartProvider } from '../context/CartContext';
import { OrdersProvider } from '../context/OrdersContext';
import { AppointmentsProvider } from '../context/AppointmentsContext';
import { ProfileProvider } from '../context/ProfileContext';
import { AuthProvider } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { ChatProvider } from '../context/ChatContext';

// Ignore the text rendering error
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component',
  'Warning: Text strings must be rendered within a <Text> component',
]);

export default function RootLayout() {
  return (
    <ProfileProvider>
      <AuthProvider>
        <ChatProvider>
          <AppointmentsProvider>
            <OrdersProvider>
              <FavoritesProvider>
                <CartProvider>
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="welcome" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                    <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
                    <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                    <Stack.Screen name="signup" options={{ headerShown: false }} />
                    <Stack.Screen name="patient-signup" options={{ headerShown: false }} />
                    <Stack.Screen name="chat-screen" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(doctor-tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(facility-tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(pharmacist-tabs)" options={{ headerShown: false }} />
                                          <Stack.Screen name="pharmacy-details-modal" options={{ headerShown: false }} />
                            <Stack.Screen name="hospital-details-modal" options={{ headerShown: false }} />
                            <Stack.Screen name="facility-management" options={{ headerShown: false }} />
                            <Stack.Screen name="pharmacy-registration" options={{ headerShown: false }} />
                            <Stack.Screen name="hospital-registration" options={{ headerShown: false }} />
                            <Stack.Screen name="pharmacist-registration" options={{ headerShown: false }} />
                            <Stack.Screen name="doctor-registration" options={{ headerShown: false }} />
                            <Stack.Screen name="hospital-map-modal" options={{ headerShown: false }} />
                            <Stack.Screen name="pharmacy-map-modal" options={{ headerShown: false }} />
                            <Stack.Screen name="reschedule-appointment-modal" options={{ headerShown: false }} />
                            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                  </Stack>
                </CartProvider>
              </FavoritesProvider>
            </OrdersProvider>
          </AppointmentsProvider>
        </ChatProvider>
      </AuthProvider>
    </ProfileProvider>
  );
}
