import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const BACKGROUND = '#f8f9fa';
const DANGER = '#e74c3c';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  emergencyContact: string;
  insuranceProvider: string;
  insuranceNumber: string;
}

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [pressedIcon, setPressedIcon] = useState<string | null>(null);
  const router = useRouter();

  const userProfile: UserProfile = {
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+233 24 123 4567",
    address: "123 Main St, Accra, Ghana",
    dateOfBirth: "January 15, 1990",
    emergencyContact: "+233 20 987 6543",
    insuranceProvider: "National Health Insurance",
    insuranceNumber: "NHIS123456789"
  };

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: "user", label: "Name", value: userProfile.name, editable: true },
        { icon: "envelope", label: "Email", value: userProfile.email, editable: true },
        { icon: "phone", label: "Phone", value: userProfile.phone, editable: true },
        { icon: "map-marker", label: "Address", value: userProfile.address, editable: true },
        { icon: "calendar", label: "Date of Birth", value: userProfile.dateOfBirth, editable: true }
      ]
    },
    {
      title: "Medical Information",
      items: [
        { icon: "phone", label: "Emergency Contact", value: userProfile.emergencyContact, editable: true },
        { icon: "shield", label: "Insurance Provider", value: userProfile.insuranceProvider, editable: true },
        { icon: "credit-card", label: "Insurance Number", value: userProfile.insuranceNumber, editable: true }
      ]
    }
  ];

  const settingsSections = [
    {
      title: "Preferences",
      items: [
        {
          icon: "bell",
          label: "Push Notifications",
          type: "switch",
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled
        },
        {
          icon: "map-marker",
          label: "Location Services",
          type: "switch",
          value: locationEnabled,
          onValueChange: setLocationEnabled
        },
        {
          icon: "moon-o",
          label: "Dark Mode",
          type: "switch",
          value: darkModeEnabled,
          onValueChange: setDarkModeEnabled
        }
      ]
    },
    {
      title: "Account",
      items: [
        { icon: "lock", label: "Change Password", type: "action" },
        { icon: "credit-card", label: "Payment Methods", type: "action" },
        { icon: "file-text", label: "Prescriptions", type: "action" },
        { icon: "history", label: "Order History", type: "action" }
      ]
    },
    {
      title: "Support",
      items: [
        { icon: "question-circle", label: "Help & FAQ", type: "action" },
        { icon: "envelope", label: "Contact Support", type: "action" },
        { icon: "star", label: "Rate App", type: "action" },
        { icon: "info-circle", label: "About", type: "action" }
      ]
    }
  ];

  const handleAction = (action: string) => {
    if (action.includes('Register')) {
      // Handle registration actions
      switch (action) {
        case 'Register Pharmacy':
          Alert.alert(
            'Register Pharmacy',
            'Would you like to register your pharmacy?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register', onPress: () => Alert.alert('Registration', 'Pharmacy registration form would open here') }
            ]
          );
          break;
        case 'Register Hospital':
          Alert.alert(
            'Register Hospital',
            'Would you like to register your hospital?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register', onPress: () => Alert.alert('Registration', 'Hospital registration form would open here') }
            ]
          );
          break;
        case 'Register as Pharmacist':
          Alert.alert(
            'Register as Pharmacist',
            'Would you like to register as a pharmacist?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register', onPress: () => Alert.alert('Registration', 'Pharmacist registration form would open here') }
            ]
          );
          break;
        case 'Register as Doctor':
          Alert.alert(
            'Register as Doctor',
            'Would you like to register as a doctor?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register', onPress: () => Alert.alert('Registration', 'Doctor registration form would open here') }
            ]
          );
          break;
        default:
          Alert.alert('Action', `${action} would be implemented here`);
      }
    } else {
      Alert.alert('Action', `${action} would be implemented here`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => Alert.alert('Logged out successfully') }
      ]
    );
  };

  const renderProfileSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={styles.profileItem}
          onPress={() => item.editable && handleAction(`Edit ${item.label}`)}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <View style={styles.iconContainer}>
              <FontAwesome name={item.icon as any} size={18} color={ACCENT} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          </View>
          {item.editable && (
            <FontAwesome name="chevron-right" size={16} color="#95a5a6" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSettingsSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.settingsItem,
            section.title === "Registration" && styles.registrationItem
          ]}
          onPress={() => item.type === 'action' && handleAction(item.label)}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <View style={[
              styles.iconContainer,
              section.title === "Registration" && styles.registrationIconContainer
            ]}>
              <FontAwesome 
                name={item.icon as any} 
                size={18} 
                color={section.title === "Registration" ? SUCCESS : ACCENT} 
              />
            </View>
            <Text style={[
              styles.itemLabel,
              section.title === "Registration" && styles.registrationLabel
            ]}>
              {item.label}
            </Text>
          </View>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#ecf0f1', true: SUCCESS }}
              thumbColor={item.value ? '#fff' : '#bdc3c7'}
              ios_backgroundColor="#ecf0f1"
            />
          ) : (
            <FontAwesome 
              name="chevron-right" 
              size={16} 
              color={section.title === "Registration" ? SUCCESS : "#95a5a6"} 
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => handleAction('Edit Profile')}>
          <FontAwesome name="edit" size={20} color={ACCENT} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBackground}>
              <FontAwesome name="user-circle" size={80} color={ACCENT} />
            </View>
          </View>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        {/* Profile Sections */}
        {profileSections.map(renderProfileSection)}
        
        {/* Registration Section */}
        <View style={styles.registrationSection}>
          <Text style={styles.sectionTitle}>Registration</Text>
          <View style={styles.registrationGrid}>
            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'pharmacy' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register Pharmacy')}
              onPressIn={() => setPressedIcon('pharmacy')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'pharmacy' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="medkit" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Pharmacy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'hospital' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register Hospital')}
              onPressIn={() => setPressedIcon('hospital')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'hospital' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="hospital-o" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Hospital</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'pharmacist' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register as Pharmacist')}
              onPressIn={() => setPressedIcon('pharmacist')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'pharmacist' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="user-md" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Pharmacist</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.registrationIcon,
                pressedIcon === 'doctor' && styles.registrationIconPressed
              ]}
              onPress={() => handleAction('Register as Doctor')}
              onPressIn={() => setPressedIcon('doctor')}
              onPressOut={() => setPressedIcon(null)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.registrationIconContainer,
                pressedIcon === 'doctor' && styles.registrationIconContainerPressed
              ]}>
                <FontAwesome name="stethoscope" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.registrationLabel}>Doctor</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map(renderSettingsSection)}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <FontAwesome name="sign-out" size={20} color={DANGER} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUCCESS,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    color: '#2c3e50',
    marginBottom: 3,
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: DANGER,
    marginLeft: 12,
  },
  registrationItem: {
    backgroundColor: 'rgba(67, 233, 123, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: SUCCESS,
  },

  registrationLabel: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  registrationSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  registrationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  registrationIcon: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 70,
  },
  registrationIconPressed: {
    transform: [{ scale: 0.95 }],
  },
  registrationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  registrationIconContainerPressed: {
    backgroundColor: 'rgba(67, 233, 123, 0.2)',
    transform: [{ scale: 0.9 }],
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
}); 