import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { notificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationInitializerProps {
  userId: number;
  userType: string;
  onInitialized?: (success: boolean) => void;
}

export default function NotificationInitializer({ 
  userId, 
  userType, 
  onInitialized 
}: NotificationInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, [userId, userType]);

  const initializeNotifications = async () => {
    try {
      setIsInitializing(true);
      console.log('🔔 NotificationInitializer - Starting initialization...', { userId, userType });

      // Always initialize notification service (even if token exists, it might have changed)
      const initialized = await notificationService.initialize();
      if (!initialized) {
        console.log('❌ NotificationInitializer - Failed to initialize notification service');
        onInitialized?.(false);
        return;
      }

      console.log('✅ NotificationInitializer - Notification service initialized');

      // Register device locally
      const deviceRegistered = await notificationService.registerDevice(userId, userType);
      if (!deviceRegistered) {
        console.log('❌ NotificationInitializer - Failed to register device locally');
        onInitialized?.(false);
        return;
      }

      console.log('✅ NotificationInitializer - Device registered locally');

      // Always register with backend (even if we have a stored token, we need to ensure it's registered)
      console.log('📤 NotificationInitializer - Registering device with backend...');
      const backendRegistered = await notificationService.registerWithBackend(userId, userType);
      if (backendRegistered) {
        console.log('✅ NotificationInitializer - Device registered with backend successfully');
      } else {
        console.log('⚠️ NotificationInitializer - Failed to register with backend, but continuing...');
        console.log('⚠️ NotificationInitializer - Push notifications may not work until device is registered');
      }

      // Set up notification listeners
      notificationService.setupNotificationListeners();
      console.log('✅ NotificationInitializer - Notification listeners set up');

      setIsInitialized(true);
      console.log('✅ NotificationInitializer - Initialization completed successfully');
      onInitialized?.(true);

    } catch (error) {
      console.error('❌ NotificationInitializer - Initialization error:', error);
      console.error('❌ NotificationInitializer - Error stack:', error.stack);
      onInitialized?.(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const permissions = await notificationService.requestPermissions();
      
      if (permissions.status === 'granted') {
        console.log('✅ NotificationInitializer - Permissions granted');
        await initializeNotifications();
      } else {
        console.log('❌ NotificationInitializer - Permissions denied');
        Alert.alert(
          'Notifications Disabled',
          'Push notifications are disabled. You can enable them in your device settings.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Settings', onPress: () => {
              // TODO: Open device settings
            }}
          ]
        );
      }
    } catch (error) {
      console.error('❌ NotificationInitializer - Error requesting permissions:', error);
    }
  };

  // Don't render anything - initialization happens in background
  // This prevents blocking the UI if initialization fails
  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 10,
  },
  text: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});
