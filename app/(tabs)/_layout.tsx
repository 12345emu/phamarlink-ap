import React, { useRef } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, useRouter } from 'expo-router';
import { Pressable, View, StyleSheet, Animated, Platform, TouchableOpacity, Text, Image } from 'react-native';
import CartHeaderButton from '@/components/CartHeaderButton';
import AppointmentsHeaderButton from '@/components/AppointmentsHeaderButton';
import ProfileImage from '@/components/ProfileImage';
import { useProfile } from '../../context/ProfileContext';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import CustomTabBar from '@/components/CustomTabBar';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function AnimatedTabBarIcon({ name, focused }: { name: React.ComponentProps<typeof FontAwesome>['name']; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [focused]);
  // Use green for active, gray for inactive
  const activeColor = '#43e97b'; // or Colors.light.tint
  const inactiveColor = '#B0B0B0';
  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: focused ? 'rgba(67,233,123,0.12)' : 'transparent',
        borderRadius: 18,
        padding: focused ? 8 : 0,
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? '#43e97b' : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FontAwesome
        size={26}
        style={{ marginBottom: -2 }}
        name={name}
        color={focused ? activeColor : inactiveColor}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#43e97b',
          tabBarInactiveTintColor: '#B0B0B0',
          headerShown: useClientOnlyValue(false, true),
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { color: '#222', fontWeight: 'bold' },
        }}
        tabBar={props => <CustomTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="home" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#ecf0f1', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="heartbeat" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  PharmaLink
                </Text>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <AppointmentsHeaderButton />
                <CartHeaderButton />
                <TouchableOpacity 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: '#ecf0f1', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <ProfileImage size={32} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="pharmacies"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="map-marker" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#ecf0f1', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="heartbeat" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  PharmaLink
                </Text>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <AppointmentsHeaderButton />
                <CartHeaderButton />
                <TouchableOpacity 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: '#ecf0f1', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <ProfileImage size={32} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="list" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#ecf0f1', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="heartbeat" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  PharmaLink
                </Text>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <AppointmentsHeaderButton />
                <CartHeaderButton />
                <TouchableOpacity 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: '#ecf0f1', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <ProfileImage size={32} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />



        <Tabs.Screen
          name="chat"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="comments" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#ecf0f1', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="heartbeat" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  PharmaLink
                </Text>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <AppointmentsHeaderButton />
                <CartHeaderButton />
                <TouchableOpacity 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: '#ecf0f1', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <ProfileImage size={32} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="appointments"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="calendar" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#ecf0f1', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="heartbeat" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  PharmaLink
                </Text>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <AppointmentsHeaderButton />
                <CartHeaderButton />
                <TouchableOpacity 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: '#ecf0f1', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <ProfileImage size={32} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="user" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#ecf0f1', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="heartbeat" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  PharmaLink
                </Text>
              </View>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                <AppointmentsHeaderButton />
                <CartHeaderButton />
                <TouchableOpacity 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    backgroundColor: '#ecf0f1', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <ProfileImage size={32} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
