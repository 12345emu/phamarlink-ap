import React, { useRef } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, useRouter } from 'expo-router';
import { Pressable, View, StyleSheet, Animated, Platform, TouchableOpacity, Text, Image } from 'react-native';
import ProfileImage from '../../components/ProfileImage';
import { useProfile } from '../../context/ProfileContext';
import { getSafeProfileImageUrl } from '../../utils/imageUtils';

import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';
import CustomTabBar from '../../components/CustomTabBar';

// Doctor-specific tab bar icon with animations
function AnimatedTabBarIcon({ name, focused }: { name: React.ComponentProps<typeof FontAwesome>['name']; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [focused]);
  
  // Use medical blue for active, gray for inactive
  const activeColor = '#3498db'; // Medical blue
  const inactiveColor = '#B0B0B0';
  
  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: focused ? 'rgba(52,152,219,0.12)' : 'transparent',
        borderRadius: 18,
        padding: focused ? 8 : 0,
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? '#3498db' : 'transparent',
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

function AppointmentsTabBarIcon({ focused }: { focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [focused]);
  
  const activeColor = '#3498db';
  const inactiveColor = '#B0B0B0';
  
  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: focused ? 'rgba(52,152,219,0.12)' : 'transparent',
        borderRadius: 18,
        padding: focused ? 8 : 0,
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? '#3498db' : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <FontAwesome
        size={26}
        style={{ marginBottom: -2 }}
        name="calendar"
        color={focused ? activeColor : inactiveColor}
      />
    </Animated.View>
  );
}

// Custom header right component with user's profile image
function HeaderRightComponent() {
  const router = useRouter();
  const { profileImage } = useProfile();
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
      <TouchableOpacity 
        style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 18, 
          backgroundColor: '#e3f2fd', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        onPress={() => router.push('/(doctor-tabs)/profile')}
        activeOpacity={0.7}
      >
        {(() => {
          const imageUrl = getSafeProfileImageUrl(profileImage);
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
            <FontAwesome name="user-md" size={20} color="#3498db" />
          );
        })()}
      </TouchableOpacity>
    </View>
  );
}

export default function DoctorTabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#3498db', // Medical blue
          tabBarInactiveTintColor: '#B0B0B0',
          headerShown: useClientOnlyValue(false, true),
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { color: '#222', fontWeight: 'bold' },
        }}
        tabBar={props => <CustomTabBar {...props} />}
      >
        {/* Doctor Dashboard */}
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
                  backgroundColor: '#e3f2fd', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="stethoscope" size={18} color="#3498db" />
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

        {/* Patient Appointments */}
        <Tabs.Screen
          name="appointments"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AppointmentsTabBarIcon focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e3f2fd', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="stethoscope" size={18} color="#3498db" />
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#2c3e50' 
                }}>
                  My Appointments
                </Text>
              </View>
            ),
            headerRight: () => <HeaderRightComponent />,
          }}
        />

        {/* Patient Management */}
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
                  backgroundColor: '#e3f2fd', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="stethoscope" size={18} color="#3498db" />
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

        {/* Prescriptions */}
        <Tabs.Screen
          name="prescriptions"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="file-text-o" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e3f2fd', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="stethoscope" size={18} color="#3498db" />
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

        {/* Chat with Patients */}
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
                  backgroundColor: '#e3f2fd', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="stethoscope" size={18} color="#3498db" />
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

        {/* Doctor Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <AnimatedTabBarIcon name="user-md" focused={focused} />,
            headerLeft: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e3f2fd', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 8
                }}>
                  <FontAwesome name="stethoscope" size={18} color="#3498db" />
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