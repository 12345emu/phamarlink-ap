import React, { useRef } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Animated, TouchableOpacity, Text, Image } from 'react-native';
import { useProfile } from '../../context/ProfileContext';
import { getSafeProfileImageUrl } from '../../utils/imageUtils';
import NotificationIcon from '../../components/NotificationIcon';

import { useColorScheme } from '../../components/useColorScheme';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';
import CustomTabBar from '../../components/CustomTabBar';

// Facility-admin tab bar icon with animations
function AnimatedTabBarIcon({ name, focused }: { name: React.ComponentProps<typeof FontAwesome>['name']; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [focused]);
  
  // Use purple for facility-admin (different from doctor blue)
  const activeColor = '#9b59b6'; // Purple
  const inactiveColor = '#B0B0B0';
  
  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: focused ? 'rgba(155,89,182,0.12)' : 'transparent',
        borderRadius: 18,
        padding: focused ? 8 : 0,
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? '#9b59b6' : 'transparent',
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
    router.push('/(facility-tabs)/notifications');
  };
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, gap: 12 }}>
      <NotificationIcon onPress={handleNotificationPress} />
      
      <TouchableOpacity 
        style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 18, 
          backgroundColor: '#f3e5f5', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        onPress={() => router.push('/(facility-tabs)/profile')}
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
            <FontAwesome name="building" size={20} color="#9b59b6" />
          );
        })()}
      </TouchableOpacity>
    </View>
  );
}

export default function FacilityTabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#9b59b6', // Purple for facility-admin
          tabBarInactiveTintColor: '#B0B0B0',
          headerShown: useClientOnlyValue(false, true),
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { color: '#222', fontWeight: 'bold' },
        }}
        tabBar={props => <CustomTabBar {...props} />}
      >
        {/* Facility Dashboard */}
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
                  backgroundColor: '#f3e5f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="building" size={18} color="#9b59b6" />
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

        {/* Facilities Management */}
        <Tabs.Screen
          name="facilities"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="hospital-o" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#f3e5f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="building" size={18} color="#9b59b6" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  My Facilities
                </Text>
              </View>
            ),
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Orders Management */}
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
                  backgroundColor: '#f3e5f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="building" size={18} color="#9b59b6" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  Orders
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
                  backgroundColor: '#f3e5f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="building" size={18} color="#9b59b6" />
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

        {/* Facility Profile */}
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
                  backgroundColor: '#f3e5f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="building" size={18} color="#9b59b6" />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

