import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 80;
const TAB_SPACING = width / 5; // Equal spacing for 5 tabs

// All tabs including Home (removed cart)
const sideTabs: { name: React.ComponentProps<typeof FontAwesome>["name"]; label: string; route: string }[] = [
  { name: 'home', label: 'Home', route: 'index' },
  { name: 'map-marker', label: 'Pharmacies', route: 'pharmacies' },
  { name: 'list', label: 'Orders', route: 'orders' },
  { name: 'comments', label: 'Chat', route: 'chat' },
  { name: 'user', label: 'Profile', route: 'profile' },
];

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { cart } = useCart();

  // Map sideTabs to their actual index in state.routes
  const getTabIndex = (routeName: string) => state.routes.findIndex(r => r.name === routeName);

  return (
    <View style={styles.wrapper}>
        {/* Modern Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.backgroundGradient} />
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        </View>
        {/* All Tabs with equal spacing */}
        {sideTabs.map((tab, idx) => {
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

const styles = StyleSheet.create({
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
    width: TAB_SPACING,
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
}); 