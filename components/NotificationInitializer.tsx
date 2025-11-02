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
      console.log('🔔 NotificationInitializer - Starting initialization...');

      // Check if already initialized
      const storedToken = await AsyncStorage.getItem('pushToken');
      if (storedToken && isInitialized) {
        console.log('🔔 NotificationInitializer - Already initialized');
        onInitialized?.(true);
        return;
      }

      // Initialize notification service
      const initialized = await notificationService.initialize();
      if (!initialized) {
        console.log('❌ NotificationInitializer - Failed to initialize');
        onInitialized?.(false);
        return;
      }

      // Register device locally
      const deviceRegistered = await notificationService.registerDevice(userId, userType);
      if (!deviceRegistered) {
        console.log('❌ NotificationInitializer - Failed to register device locally');
        onInitialized?.(false);
        return;
      }

      // Register with backend
      const backendRegistered = await notificationService.registerWithBackend(userId, userType);
      if (!backendRegistered) {
        console.log('⚠️ NotificationInitializer - Failed to register with backend, but continuing...');
      }

      // Set up notification listeners
      notificationService.setupNotificationListeners();

      setIsInitialized(true);
      console.log('✅ NotificationInitializer - Initialization completed');
      onInitialized?.(true);

    } catch (error) {
      console.error('❌ NotificationInitializer - Initialization error:', error);
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

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Setting up notifications...</Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Notifications not initialized</Text>
      </View>
    );
  }

  return null; // Don't render anything when initialized
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
