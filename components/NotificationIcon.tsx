import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { notificationService } from '../services/notificationService';
import { notificationsApiService } from '../services/notificationsApiService';

interface NotificationIconProps {
  onPress?: () => void;
  size?: number;
  showBadge?: boolean;
  style?: any;
}

export default function NotificationIcon({ 
  onPress, 
  size = 20, 
  showBadge = true,
  style 
}: NotificationIconProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const initialized = notificationService.isServiceInitialized();
      setIsInitialized(initialized);
      
      // Get actual unread count from backend
      const response = await notificationsApiService.getUnreadCount();
      if (response.success && response.count !== undefined) {
        setUnreadCount(response.count);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('❌ Error checking notification status:', error);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadUnreadCount();
    
    // Refresh every 15 seconds to keep count updated
    const interval = setInterval(loadUnreadCount, 15000);
    
    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadUnreadCount();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loadUnreadCount]);

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <FontAwesome 
        name="bell" 
        size={size} 
        color={isInitialized ? "#3498db" : "#bdc3c7"} 
      />
      {showBadge && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
