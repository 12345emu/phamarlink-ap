import React, { useRef } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Animated, TouchableOpacity, Text, Image } from 'react-native';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { getSafeProfileImageUrl } from '../../utils/imageUtils';
import NotificationIcon from '../../components/NotificationIcon';
import NotificationInitializer from '../../components/NotificationInitializer';

import { useColorScheme } from '../../components/useColorScheme';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';
import CustomTabBar from '../../components/CustomTabBar';

// Pharmacist-specific tab bar icon with animations
function AnimatedTabBarIcon({ name, focused }: { name: React.ComponentProps<typeof FontAwesome>['name']; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [focused]);
  
  // Use green for pharmacist (different from doctor blue)
  const activeColor = '#2ecc71'; // Green
  const inactiveColor = '#B0B0B0';
  
  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: focused ? 'rgba(46,204,113,0.12)' : 'transparent',
        borderRadius: 18,
        padding: focused ? 8 : 0,
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? '#2ecc71' : 'transparent',
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

// Custom header right component with notification icon and user's profile image
function HeaderRightComponent() {
  const router = useRouter();
  const { profileImage } = useProfile();
  
  const handleNotificationPress = () => {
    router.push('/(pharmacist-tabs)/notifications');
  };
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, gap: 12 }}>
      <NotificationIcon onPress={handleNotificationPress} />
      
      <TouchableOpacity 
        style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 18, 
          backgroundColor: '#e8f8f5', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        onPress={() => router.push('/(pharmacist-tabs)/profile')}
        activeOpacity={0.7}
      >
        {(() => {
          let imageUrl: string | null = null;
          
          if (profileImage) {
            if (profileImage.startsWith('file://')) {
              imageUrl = profileImage;
            } else {
              imageUrl = getSafeProfileImageUrl(profileImage);
            }
          }
          
          return imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
              }}
              resizeMode="cover"
              onError={(error) => {
                console.warn('Failed to load header profile image:', error);
              }}
            />
          ) : (
            <FontAwesome name="medkit" size={20} color="#2ecc71" />
          );
        })()}
      </TouchableOpacity>
    </View>
  );
}

export default function PharmacistTabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Initialize push notifications */}
        {user && user.id && (
          <NotificationInitializer 
            userId={typeof user.id === 'string' ? parseInt(user.id, 10) : user.id} 
            userType={user.role || 'pharmacist'} 
          />
        )}
        <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2ecc71', // Green for pharmacist
          tabBarInactiveTintColor: '#B0B0B0',
          headerShown: useClientOnlyValue(false, true),
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { color: '#222', fontWeight: 'bold' },
        }}
        tabBar={props => <CustomTabBar {...props} />}
      >
        {/* Pharmacist Dashboard */}
        <Tabs.Screen
          name="index"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="dashboard" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e8f8f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="medkit" size={18} color="#2ecc71" />
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
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Inventory */}
        <Tabs.Screen
          name="inventory"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="archive" focused={focused} />,
            headerShown: false,
          }}
        />

        {/* Orders */}
        <Tabs.Screen
          name="orders"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="list-alt" focused={focused} />,
            headerShown: false,
          }}
        />

        {/* Medicine Details - Hidden from tab bar but accessible via navigation */}
        <Tabs.Screen
          name="medicine-details"
          options={{
            title: '',
            tabBarButton: () => null, // Hide from tab bar
            headerShown: false,
          }}
        />

        {/* Prescriptions - Hidden from tab bar but accessible via navigation */}
        <Tabs.Screen
          name="prescriptions"
          options={{
            title: '',
            tabBarButton: () => null, // Hide from tab bar
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e8f8f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="medkit" size={18} color="#2ecc71" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  Prescriptions
                </Text>
              </View>
            ),
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Patients */}
        <Tabs.Screen
          name="patients"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="users" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e8f8f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="medkit" size={18} color="#2ecc71" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  My Patients
                </Text>
              </View>
            ),
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Chat */}
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
                  backgroundColor: '#e8f8f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="medkit" size={18} color="#2ecc71" />
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
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Notifications */}
        <Tabs.Screen
          name="notifications"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="bell" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e8f8f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="medkit" size={18} color="#2ecc71" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  Notifications
                </Text>
              </View>
            ),
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Profile */}
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
                  backgroundColor: '#e8f8f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="medkit" size={18} color="#2ecc71" />
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
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        </Tabs>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

