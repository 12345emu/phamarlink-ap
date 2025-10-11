import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function DoctorProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const profileSections = [
    {
      title: 'Account Settings',
      items: [
        {
          icon: 'user',
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          onPress: () => {
            // TODO: Navigate to edit profile screen
            Alert.alert('Edit Profile', 'This will open the profile editing form');
          }
        },
        {
          icon: 'lock',
          title: 'Change Password',
          subtitle: 'Update your account password',
          onPress: () => {
            // TODO: Navigate to change password screen
            Alert.alert('Change Password', 'This will open the password change form');
          }
        },
        {
          icon: 'bell',
          title: 'Notifications',
          subtitle: 'Manage notification preferences',
          onPress: () => {
            // TODO: Navigate to notification settings
            Alert.alert('Notifications', 'This will open notification settings');
          }
        },
      ]
    },
    {
      title: 'Professional Settings',
      items: [
        {
          icon: 'clock-o',
          title: 'Availability',
          subtitle: 'Set your working hours',
          onPress: () => {
            // TODO: Navigate to availability settings
            Alert.alert('Availability', 'This will open availability settings');
          }
        },
        {
          icon: 'stethoscope',
          title: 'Specializations',
          subtitle: 'Manage your medical specializations',
          onPress: () => {
            // TODO: Navigate to specializations
            Alert.alert('Specializations', 'This will open specializations management');
          }
        },
        {
          icon: 'hospital-o',
          title: 'Hospital Affiliations',
          subtitle: 'Manage hospital partnerships',
          onPress: () => {
            // TODO: Navigate to hospital affiliations
            Alert.alert('Hospital Affiliations', 'This will open hospital management');
          }
        },
      ]
    },
    {
      title: 'Support & Help',
      items: [
        {
          icon: 'question-circle',
          title: 'Help & FAQ',
          subtitle: 'Get help and find answers',
          onPress: () => {
            // TODO: Navigate to help screen
            Alert.alert('Help & FAQ', 'This will open the help section');
          }
        },
        {
          icon: 'phone',
          title: 'Contact Support',
          subtitle: 'Get in touch with our support team',
          onPress: () => {
            // TODO: Navigate to contact support
            Alert.alert('Contact Support', 'This will open the support contact form');
          }
        },
        {
          icon: 'info-circle',
          title: 'About PharmaLink',
          subtitle: 'Learn more about the app',
          onPress: () => {
            // TODO: Navigate to about screen
            Alert.alert('About PharmaLink', 'This will open the about section');
          }
        },
      ]
    }
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <LinearGradient
        colors={['#3498db', '#2980b9']}
        style={styles.header}
      >
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.doctorName}>Dr. {user?.firstName} {user?.lastName}</Text>
            <Text style={styles.specialty}>General Practitioner</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Settings */}
      <View style={styles.quickSettings}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <FontAwesome name="bell" size={20} color="#3498db" />
            <Text style={styles.settingTitle}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#bdc3c7', true: '#3498db' }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <FontAwesome name="clock-o" size={20} color="#2ecc71" />
            <Text style={styles.settingTitle}>Available for Appointments</Text>
          </View>
          <Switch
            value={availabilityEnabled}
            onValueChange={setAvailabilityEnabled}
            trackColor={{ false: '#bdc3c7', true: '#2ecc71' }}
            thumbColor={availabilityEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Profile Sections */}
      {profileSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <FontAwesome name={item.icon as any} size={20} color="#3498db" />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>PharmaLink Doctor Portal v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  doctorName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  specialty: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 4,
  },
  email: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  quickSettings: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  logoutSection: {
    margin: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    marginLeft: 10,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#bdc3c7',
  },
});
