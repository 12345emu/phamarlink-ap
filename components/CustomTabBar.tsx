import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 80;

// Patient tabs
const patientTabs: { name: React.ComponentProps<typeof FontAwesome>["name"]; label: string; route: string }[] = [
  { name: 'home', label: 'Home', route: 'index' },
  { name: 'map-marker', label: 'Pharmacies', route: 'pharmacies' },
  { name: 'list', label: 'Orders', route: 'orders' },
  { name: 'comments', label: 'Chat', route: 'chat' },
  { name: 'user', label: 'Profile', route: 'profile' },
];

// Doctor tabs
const doctorTabs: { name: React.ComponentProps<typeof FontAwesome>["name"]; label: string; route: string }[] = [
  { name: 'home', label: 'Home', route: 'index' },
  { name: 'calendar', label: 'Appointments', route: 'appointments' },
  { name: 'users', label: 'Patients', route: 'patients' },
  { name: 'comments', label: 'Chat', route: 'chat' },
  { name: 'user-md', label: 'Profile', route: 'profile' },
];

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { cart } = useCart();
  const { orders } = useOrders();
  const { user } = useAuth();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Fetch chat unread count
  useEffect(() => {
    const loadChatUnreadCount = async () => {
      try {
        const response = await chatService.getConversations();
        if (response && response.success && response.data && Array.isArray(response.data)) {
          const totalUnread = response.data.reduce((sum: number, conv: any) => {
            let count = 0;
            if (conv.unread_count !== undefined && conv.unread_count !== null) {
              if (typeof conv.unread_count === 'string') {
                count = parseInt(conv.unread_count, 10) || 0;
              } else if (typeof conv.unread_count === 'number') {
                count = conv.unread_count;
              } else if (typeof conv.unread_count === 'bigint') {
                count = Number(conv.unread_count);
              }
            }
            return sum + count;
          }, 0);
          setChatUnreadCount(totalUnread);
        }
      } catch (error) {
        // Silently fail
      }
    };

    loadChatUnreadCount();
    const interval = setInterval(loadChatUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Determine which tabs to show based on user role
  const isDoctor = user?.role === 'doctor';
  const currentTabs = isDoctor ? doctorTabs : patientTabs;
  const TAB_SPACING = width / currentTabs.length; // Dynamic spacing based on number of tabs

  // Map currentTabs to their actual index in state.routes
  const getTabIndex = (routeName: string) => state.routes.findIndex(r => r.name === routeName);

  const styles = createStyles(TAB_SPACING);

  return (
    <View style={styles.wrapper}>
        {/* Modern Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.backgroundGradient} />
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        </View>
        {/* All Tabs with equal spacing */}
        {currentTabs.map((tab, idx) => {
          const tabIndex = getTabIndex(tab.route);
          const isActive = state.index === tabIndex;
          
          return (
            <TouchableOpacity
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              onPress={() => navigation.navigate(tab.route)}
              style={[styles.tab, { left: idx * TAB_SPACING }]}
              activeOpacity={0.8}
            >
              <Animated.View 
                style={[
                  styles.tabContent,
                  { 
                    transform: [{ scale: isActive ? 1.1 : 1 }], 
                    opacity: isActive ? 1 : 0.6 
                  }
                ]}
              >
                <View style={[
                  styles.iconContainer,
                  isActive && styles.activeIconContainer
                ]}>
                  <FontAwesome 
                    name={tab.name} 
                    size={22} 
                    color={isActive ? '#43e97b' : '#8e8e93'} 
                  />
                  {/* Orders Badge - Only for patients */}
                  {!isDoctor && tab.route === 'orders' && orders.length > 0 && (
                    <View style={styles.ordersBadge}>
                      <Text style={styles.ordersBadgeText}>
                        {orders.length > 99 ? '99+' : orders.length}
                      </Text>
                    </View>
                  )}
                  {/* Chat Badge */}
                  {tab.route === 'chat' && chatUnreadCount > 0 && (
                    <View style={styles.ordersBadge}>
                      <Text style={styles.ordersBadgeText}>
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel
                ]}>
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
  );
}

const createStyles = (tabSpacing: number) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    height: TAB_HEIGHT + 10,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tab: {
    position: 'absolute',
    top: 8,
    width: tabSpacing,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#43e97b',
    fontWeight: '600',
  },

  handleContainer: {
    position: 'absolute',
    left: width / 2 - 25,
    bottom: TAB_HEIGHT + 30,
    zIndex: 200,
    width: 50,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bbb',
    opacity: 0.7,
  },
  cartBadgeTab: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 4,
  },
  cartBadgeTabText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  ordersBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  ordersBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 