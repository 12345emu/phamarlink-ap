import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform, Dimensions, PanResponder, TouchableWithoutFeedback, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 70;
const FLOATING_RADIUS = 36;
const AUTO_HIDE_DELAY = 3000; // 3 seconds

// Only side tabs (no Home in this array)
const sideTabs: { name: React.ComponentProps<typeof FontAwesome>["name"]; label: string; route: string }[] = [
  { name: 'map-marker', label: 'Pharmacies', route: 'pharmacies' },
  { name: 'shopping-cart', label: 'Orders', route: 'orders' },
  { name: 'comments', label: 'Chat', route: 'chat' },
  { name: 'user', label: 'Profile', route: 'profile' },
];

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { cart } = useCart();
  const [visible, setVisible] = useState(true);
  const hideAnim = useRef(new Animated.Value(0)).current; // 0: visible, 1: hidden
  const hideTimeout = useRef<number | null>(null);
  const [isHandleVisible, setIsHandleVisible] = useState(false);

  // PanResponder for swipe down/up
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 30) {
          // Swipe down to hide
          setVisible(false);
          setIsHandleVisible(true);
        }
        if (gestureState.dy < -30 && isHandleVisible) {
          // Swipe up to show
          setVisible(true);
          setIsHandleVisible(false);
        }
      },
    })
  ).current;

  // Animate visibility
  useEffect(() => {
    Animated.timing(hideAnim, {
      toValue: visible ? 0 : 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Auto-hide after inactivity
  const resetHideTimer = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setVisible(true);
    setIsHandleVisible(false);
    hideTimeout.current = setTimeout(() => {
      setVisible(false);
      setIsHandleVisible(true);
    }, AUTO_HIDE_DELAY);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [state.index]);

  // Listen for any touch to reset timer
  useEffect(() => {
    const touchListener = () => resetHideTimer();
    // Add global touch listener
    const subscription = () => {
      // For Expo/React Native, you may need to use a custom event or wrap the app in TouchableWithoutFeedback
      // Here, we assume the tab bar is wrapped in TouchableWithoutFeedback
    };
    return () => {
      // Clean up
    };
  }, []);

  // Animated translateY for hide/show
  const translateY = hideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_HEIGHT + 80],
  });

  // Find the index for Home (index route)
  const homeIndex = state.routes.findIndex(r => r.name === 'index');
  const isHomeFocused = state.index === homeIndex;

  // Map sideTabs to their actual index in state.routes
  const getTabIndex = (routeName: string) => state.routes.findIndex(r => r.name === routeName);

  return (
    <>
      {/* Handle for manual reveal */}
      {isHandleVisible && (
        <TouchableOpacity
          style={styles.handleContainer}
          onPress={() => { setVisible(true); setIsHandleVisible(false); }}
          activeOpacity={0.7}
        >
          <View style={styles.handle} />
        </TouchableOpacity>
      )}
      <Animated.View
        style={[styles.wrapper, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* SVG Curved Gradient Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={TAB_HEIGHT + 30}>
            <Defs>
              <LinearGradient id="navGradient" x1="0" y1="0" x2={width} y2="0">
                <Stop offset="0%" stopColor="#e0f7fa" />
                <Stop offset="100%" stopColor="#e6ffe6" />
              </LinearGradient>
            </Defs>
            <Path
              d={`M0 30 Q${width / 10} 0,${width / 2 - FLOATING_RADIUS} 0 Q${width / 2} 0,${width / 2} 30 Q${width / 2} 0,${width / 2 + FLOATING_RADIUS} 0 Q${width - width / 10} 0,${width} 30 V${TAB_HEIGHT + 30} H0 Z`}
              fill="url(#navGradient)"
              opacity={0.98}
            />
          </Svg>
          {/* Glassmorphic Blur */}
          <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
        </View>
        {/* Side Tabs (2 left, 2 right) */}
        {sideTabs.map((tab, idx) => {
          // Place 2 tabs on the left, 2 on the right
          const tabIndex = getTabIndex(tab.route);
          // Left tabs
          if (idx < 2) {
            return (
              <TouchableOpacity
                key={tab.name}
                accessibilityRole="button"
                accessibilityState={state.index === tabIndex ? { selected: true } : {}}
                onPress={() => navigation.navigate(tab.route)}
                style={[styles.tab, { left: idx === 0 ? 0 : 60 }]}
                activeOpacity={0.7}
              >
                <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: state.index === tabIndex ? 1.15 : 1 }], opacity: state.index === tabIndex ? 1 : 0.7 }}>
                  <FontAwesome name={tab.name} size={24} color={state.index === tabIndex ? '#43e97b' : '#222'} />
                  {tab.name === 'shopping-cart' && cart.length > 0 && (
                    <View style={styles.cartBadgeTab}>
                      <Text style={styles.cartBadgeTabText}>{cart.length}</Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          }
          // Right tabs
          return (
            <TouchableOpacity
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={state.index === tabIndex ? { selected: true } : {}}
              onPress={() => navigation.navigate(tab.route)}
              style={[styles.tab, { right: idx === 2 ? 60 : 0 }]}
              activeOpacity={0.7}
            >
              <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: state.index === tabIndex ? 1.15 : 1 }], opacity: state.index === tabIndex ? 1 : 0.7 }}>
                <FontAwesome name={tab.name} size={24} color={state.index === tabIndex ? '#43e97b' : '#222'} />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
        {/* Floating Home Button (center) */}
        <View style={styles.centerTabContainer} pointerEvents="box-none">
          <Animated.View style={[styles.fab, isHomeFocused && styles.fabActive, Platform.OS === 'android' && { elevation: 8 }]}> 
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isHomeFocused ? { selected: true } : {}}
              onPress={() => navigation.navigate('index')}
              style={{ alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.8}
            >
              <FontAwesome name="home" size={32} color={isHomeFocused ? '#43e97b' : '#222'} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </>
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
  tab: {
    position: 'absolute',
    top: 10,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTabContainer: {
    position: 'absolute',
    left: width / 2 - FLOATING_RADIUS,
    top: -FLOATING_RADIUS / 2,
    width: FLOATING_RADIUS * 2,
    height: FLOATING_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fab: {
    width: FLOATING_RADIUS * 2,
    height: FLOATING_RADIUS * 2,
    borderRadius: FLOATING_RADIUS,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  fabActive: {
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
    backgroundColor: '#f6fff9',
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