import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

  const userProfile: UserProfile = {
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main St, Apt 4B, New York, NY 10001",
    dateOfBirth: "January 15, 1990",
    emergencyContact: "+1 (555) 987-6543",
    insuranceProvider: "Blue Cross Blue Shield",
    insuranceNumber: "BCBS123456789"
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
    Alert.alert('Action', `${action} would be implemented here`);
  };

  const renderProfileSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={styles.profileItem}
          onPress={() => item.editable && handleAction(`Edit ${item.label}`)}
        >
          <View style={styles.itemLeft}>
            <FontAwesome name={item.icon as any} size={20} color="#4CAF50" style={styles.itemIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          </View>
          {item.editable && (
            <FontAwesome name="chevron-right" size={16} color="#ccc" />
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
          style={styles.settingsItem}
          onPress={() => item.type === 'action' && handleAction(item.label)}
        >
          <View style={styles.itemLeft}>
            <FontAwesome name={item.icon as any} size={20} color="#4CAF50" style={styles.itemIcon} />
            <Text style={styles.itemLabel}>{item.label}</Text>
          </View>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={item.value ? '#fff' : '#f4f3f4'}
            />
          ) : (
            <FontAwesome name="chevron-right" size={16} color="#ccc" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <FontAwesome name="edit" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <FontAwesome name="user-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
        </View>

        {profileSections.map(renderProfileSection)}
        {settingsSections.map(renderSettingsSection)}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => Alert.alert('Logout', 'Would you like to logout?')}
        >
          <FontAwesome name="sign-out" size={20} color="#f44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  editButton: {
    padding: 10,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: 15,
    width: 20,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
    marginLeft: 10,
  },
}); 