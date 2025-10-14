import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useRouter } from 'expo-router';
import DoctorEditProfileModal from '../doctor-edit-profile-modal';
import ChangePasswordModal from '../change-password-modal';
import NotificationsSettingsModal from '../notifications-settings-modal';
import AvailabilitySettingsModal from '../availability-settings-modal';
import SpecializationsModal from '../specializations-modal';
import HospitalAffiliationsModal from '../hospital-affiliations-modal';
import HelpFAQModal from '../help-faq-modal';
import ContactSupportModal from '../contact-support-modal';
import AboutPharmaLinkModal from '../about-pharmalink-modal';
import { getSafeProfileImageUrl } from '../../utils/imageUtils';

export default function DoctorProfile() {
  const { user, logout } = useAuth();
  const { profileImage, refreshProfileImage, setProfileImageUpdateCallback } = useProfile();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [notificationsSettingsModalVisible, setNotificationsSettingsModalVisible] = useState(false);
  const [availabilitySettingsModalVisible, setAvailabilitySettingsModalVisible] = useState(false);
  const [specializationsModalVisible, setSpecializationsModalVisible] = useState(false);
  const [hospitalAffiliationsModalVisible, setHospitalAffiliationsModalVisible] = useState(false);
  const [helpFAQModalVisible, setHelpFAQModalVisible] = useState(false);
  const [contactSupportModalVisible, setContactSupportModalVisible] = useState(false);
  const [aboutPharmaLinkModalVisible, setAboutPharmaLinkModalVisible] = useState(false);
  const [profileImageRefreshKey, setProfileImageRefreshKey] = useState(0);
  const [forceImageRefresh, setForceImageRefresh] = useState(0);

  // Debug profileImage changes and force refresh
  useEffect(() => {
    console.log('🔍 ProfilePage - profileImage changed to:', profileImage);
    if (profileImage) {
      console.log('🔍 ProfilePage - Profile image detected, forcing refresh');
      setProfileImageRefreshKey(prev => prev + 1);
      setForceImageRefresh(prev => prev + 1);
    }
  }, [profileImage]);

  // Debug forceImageRefresh changes
  useEffect(() => {
    console.log('🔍 ProfilePage - forceImageRefresh changed to:', forceImageRefresh);
  }, [forceImageRefresh]);

  // Set up callback for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      console.log('🔍 ProfilePage - Profile image update callback triggered');
      setProfileImageRefreshKey(prev => prev + 1);
      setForceImageRefresh(prev => prev + 1);
    };

    setProfileImageUpdateCallback(() => handleProfileImageUpdate);

    // Cleanup callback on unmount
    return () => {
      setProfileImageUpdateCallback(null);
    };
  }, [setProfileImageUpdateCallback]);

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

  const handleNotificationsToggle = () => {
    if (notificationsEnabled) {
      // If turning off, show confirmation
      Alert.alert(
        'Disable Notifications',
        'Are you sure you want to disable all notifications? You can customize specific notification types in the settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => setNotificationsEnabled(false)
          },
          {
            text: 'Customize',
            onPress: () => setNotificationsSettingsModalVisible(true)
          }
        ]
      );
    } else {
      setNotificationsEnabled(true);
    }
  };

  const handleAvailabilityToggle = () => {
    if (availabilityEnabled) {
      // If turning off, show confirmation
      Alert.alert(
        'Set Unavailable',
        'Are you sure you want to set yourself as unavailable? You can customize your availability schedule in the settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Unavailable',
            style: 'destructive',
            onPress: () => setAvailabilityEnabled(false)
          },
          {
            text: 'Customize',
            onPress: () => setAvailabilitySettingsModalVisible(true)
          }
        ]
      );
    } else {
      setAvailabilityEnabled(true);
    }
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
            setEditModalVisible(true);
          }
        },
        {
          icon: 'lock',
          title: 'Change Password',
          subtitle: 'Update your account password',
          onPress: () => {
            setChangePasswordModalVisible(true);
          }
        },
        {
          icon: 'bell',
          title: 'Notifications',
          subtitle: 'Manage notification preferences',
          onPress: () => {
            setNotificationsSettingsModalVisible(true);
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
            setAvailabilitySettingsModalVisible(true);
          }
        },
        {
          icon: 'stethoscope',
          title: 'Specializations',
          subtitle: 'Manage your medical specializations',
          onPress: () => {
            setSpecializationsModalVisible(true);
          }
        },
        {
          icon: 'hospital-o',
          title: 'Hospital Affiliations',
          subtitle: 'Manage hospital partnerships',
          onPress: () => {
            setHospitalAffiliationsModalVisible(true);
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
            setHelpFAQModalVisible(true);
          }
        },
        {
          icon: 'phone',
          title: 'Contact Support',
          subtitle: 'Get in touch with our support team',
          onPress: () => {
            setContactSupportModalVisible(true);
          }
        },
        {
          icon: 'info-circle',
          title: 'About PharmaLink',
          subtitle: 'Learn more about the app',
          onPress: () => {
            setAboutPharmaLinkModalVisible(true);
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
            {(() => {
              // Handle local file URIs directly, use getSafeProfileImageUrl for network URLs
              let imageUrl: string | null = null;
              
              if (profileImage) {
                if (profileImage.startsWith('file://')) {
                  // Local file URI - use directly
                  imageUrl = profileImage;
                  console.log('🔍 ProfilePage - Using local file URI directly:', imageUrl);
                } else {
                  // Network URL - use getSafeProfileImageUrl
                  imageUrl = getSafeProfileImageUrl(profileImage);
                  console.log('🔍 ProfilePage - Using getSafeProfileImageUrl for network URL:', imageUrl);
                }
              }
              
              console.log('🔍 ProfilePage - profileImage from context:', profileImage);
              console.log('🔍 ProfilePage - final imageUrl:', imageUrl);
              console.log('🔍 ProfilePage - Image URL type:', typeof imageUrl);
              console.log('🔍 ProfilePage - Image URL length:', imageUrl?.length);
              
              return imageUrl ? (
                <Image
                  key={`${profileImageRefreshKey}-${forceImageRefresh}`}
                  source={{ uri: imageUrl }}
                  style={styles.avatar}
                  onError={(error) => {
                    console.warn('❌ ProfilePage - Failed to load profile image:', error);
                    console.warn('❌ ProfilePage - Image URL was:', imageUrl);
                    console.warn('❌ ProfilePage - Error details:', error.nativeEvent);
                  }}
                  onLoad={() => {
                    console.log('✅ ProfilePage - Profile image loaded successfully');
                    console.log('✅ ProfilePage - Loaded image URL:', imageUrl);
                  }}
                />
              ) : (
                <View key={`${profileImageRefreshKey}-${forceImageRefresh}`} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </Text>
                </View>
              );
            })()}
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
            onValueChange={handleNotificationsToggle}
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
            onValueChange={handleAvailabilityToggle}
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

      {/* Edit Profile Modal */}
      <DoctorEditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onProfileUpdated={async () => {
          console.log('🔍 ProfilePage - onProfileUpdated called');
          
          // Force immediate refresh
          console.log('🔍 ProfilePage - Forcing immediate profile image refresh');
          setProfileImageRefreshKey(prev => prev + 1);
          setForceImageRefresh(prev => prev + 1);
          
          // Also try to refresh from context
          try {
            await refreshProfileImage();
            console.log('✅ ProfilePage - Profile image refreshed from context');
          } catch (error) {
            console.error('❌ ProfilePage - Error refreshing profile image:', error);
          }
          
          // Force another refresh after a short delay
          setTimeout(() => {
            console.log('🔍 ProfilePage - Delayed refresh triggered');
            setProfileImageRefreshKey(prev => prev + 1);
            setForceImageRefresh(prev => prev + 1);
          }, 100);
          
          setEditModalVisible(false);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
        onPasswordChanged={() => {
          // Password changed successfully
          setChangePasswordModalVisible(false);
        }}
      />

      {/* Notifications Settings Modal */}
      <NotificationsSettingsModal
        visible={notificationsSettingsModalVisible}
        onClose={() => setNotificationsSettingsModalVisible(false)}
        onSettingsUpdated={() => {
          // Notification settings updated successfully
          setNotificationsSettingsModalVisible(false);
        }}
      />

      {/* Availability Settings Modal */}
      <AvailabilitySettingsModal
        visible={availabilitySettingsModalVisible}
        onClose={() => setAvailabilitySettingsModalVisible(false)}
        onSettingsUpdated={() => {
          // Availability settings updated successfully
          setAvailabilitySettingsModalVisible(false);
        }}
      />

      {/* Specializations Modal */}
      <SpecializationsModal
        visible={specializationsModalVisible}
        onClose={() => setSpecializationsModalVisible(false)}
        onSpecializationsUpdated={() => {
          // Specializations updated successfully
          setSpecializationsModalVisible(false);
        }}
      />

      {/* Hospital Affiliations Modal */}
      <HospitalAffiliationsModal
        visible={hospitalAffiliationsModalVisible}
        onClose={() => setHospitalAffiliationsModalVisible(false)}
        onAffiliationsUpdated={() => {
          // Hospital affiliations updated successfully
          setHospitalAffiliationsModalVisible(false);
        }}
      />

      {/* Help & FAQ Modal */}
      <HelpFAQModal
        visible={helpFAQModalVisible}
        onClose={() => setHelpFAQModalVisible(false)}
      />

      {/* Contact Support Modal */}
      <ContactSupportModal
        visible={contactSupportModalVisible}
        onClose={() => setContactSupportModalVisible(false)}
      />

      {/* About PharmaLink Modal */}
      <AboutPharmaLinkModal
        visible={aboutPharmaLinkModalVisible}
        onClose={() => setAboutPharmaLinkModalVisible(false)}
      />
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
    marginBottom: 100, // Add extra bottom margin to avoid tab overlap
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
    marginBottom: 50, // Add extra bottom margin to avoid tab overlap
  },
  versionText: {
    fontSize: 12,
    color: '#bdc3c7',
  },
});
