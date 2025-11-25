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
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useRouter } from 'expo-router';
import ChangePasswordModal from '../change-password-modal';
import NotificationsSettingsModal from '../notifications-settings-modal';
import HelpFAQModal from '../help-faq-modal';
import ContactSupportModal from '../contact-support-modal';
import AboutPharmaLinkModal from '../about-pharmalink-modal';
import FacilityAdminEditProfileModal from '../facility-admin-edit-profile-modal';
import { getSafeProfileImageUrl } from '../../utils/imageUtils';
import { facilitiesService } from '../../services/facilitiesService';
import { professionalsService } from '../../services/professionalsService';
import { validateProfileImage } from '../../utils/imageValidation';
import { notificationSettingsService } from '../../services/notificationSettingsService';

export default function FacilityAdminProfile() {
  const { user, logout } = useAuth();
  const { profileImage, updateProfileImage, refreshProfileImage, setProfileImageUpdateCallback } = useProfile();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [notificationsSettingsModalVisible, setNotificationsSettingsModalVisible] = useState(false);
  const [helpFAQModalVisible, setHelpFAQModalVisible] = useState(false);
  const [contactSupportModalVisible, setContactSupportModalVisible] = useState(false);
  const [aboutPharmaLinkModalVisible, setAboutPharmaLinkModalVisible] = useState(false);
  const [profileImageRefreshKey, setProfileImageRefreshKey] = useState(0);
  const [forceImageRefresh, setForceImageRefresh] = useState(0);
  const [facilitiesCount, setFacilitiesCount] = useState(0);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [staffCount, setStaffCount] = useState(0);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadFacilitiesCount();
    loadStaffCount();
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const response = await notificationSettingsService.getPreferences();
      if (response.success && response.data) {
        setNotificationsEnabled(response.data.pushNotifications);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const loadFacilitiesCount = async () => {
    try {
      setLoadingFacilities(true);
      const response = await facilitiesService.getMyFacilities();
      if (response.success && response.data) {
        setFacilitiesCount(response.data.length);
      }
    } catch (error) {
      console.error('Error loading facilities count:', error);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const loadStaffCount = async () => {
    try {
      setLoadingStaff(true);
      // First get all facilities
      const facilitiesResponse = await facilitiesService.getMyFacilities();
      if (!facilitiesResponse.success || !facilitiesResponse.data || facilitiesResponse.data.length === 0) {
        setStaffCount(0);
        return;
      }

      // Get staff from all facilities
      const staffPromises = facilitiesResponse.data.map((facility: any) =>
        professionalsService.getProfessionalsByFacility(facility.id, 100, true)
      );

      const staffResponses = await Promise.all(staffPromises);
      
      // Count unique staff members across all facilities
      const uniqueStaffIds = new Set<number>();
      
      staffResponses.forEach((response) => {
        if (response.success && response.data) {
          const data = response.data as any;
          const professionals = Array.isArray(data.professionals)
            ? data.professionals
            : Array.isArray(data?.data?.professionals)
              ? data.data.professionals
              : [];
          
          professionals.forEach((professional: any) => {
            if (professional.user_id) {
              uniqueStaffIds.add(professional.user_id);
            } else if (professional.id) {
              uniqueStaffIds.add(professional.id);
            }
          });
        }
      });

      setStaffCount(uniqueStaffIds.size);
    } catch (error) {
      console.error('Error loading staff count:', error);
      setStaffCount(0);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Debug profileImage changes and force refresh
  useEffect(() => {
    if (profileImage) {
      setProfileImageRefreshKey(prev => prev + 1);
      setForceImageRefresh(prev => prev + 1);
    }
  }, [profileImage]);

  // Set up callback for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      setProfileImageRefreshKey(prev => prev + 1);
      setForceImageRefresh(prev => prev + 1);
    };

    setProfileImageUpdateCallback(() => handleProfileImageUpdate);

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

  const handleNotificationsToggle = async () => {
    if (notificationsEnabled) {
      Alert.alert(
        'Disable Notifications',
        'Are you sure you want to disable all push notifications? You can customize specific notification types in the settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              // Get current preferences and update push notifications
              const currentPrefs = await notificationSettingsService.getPreferences();
              if (currentPrefs.success && currentPrefs.data) {
                const updatedPrefs = {
                  ...currentPrefs.data,
                  pushNotifications: false,
                };
                await notificationSettingsService.updatePreferences(updatedPrefs);
                setNotificationsEnabled(false);
              } else {
                setNotificationsEnabled(false);
              }
            }
          }
        ]
      );
    } else {
      // Get current preferences and update push notifications
      const currentPrefs = await notificationSettingsService.getPreferences();
      if (currentPrefs.success && currentPrefs.data) {
        const updatedPrefs = {
          ...currentPrefs.data,
          pushNotifications: true,
        };
        await notificationSettingsService.updatePreferences(updatedPrefs);
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(true);
      }
    }
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleProfileUpdated = () => {
    // Refresh profile image if needed
    refreshProfileImage();
    // Reload facilities count in case it changed
    loadFacilitiesCount();
    // Reload staff count in case it changed
    loadStaffCount();
    // Reload notification settings in case they changed
    loadNotificationSettings();
  };

  const requestImagePermission = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        `Please allow ${
          source === 'camera' ? 'camera' : 'photo library'
        } access to update your profile picture.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Linking.openSettings) {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    }

    return true;
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setIsUploadingImage(true);

      const hasPermission = await requestImagePermission(source);
      if (!hasPermission) {
        return;
      }

      const baseOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        exif: false,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              ...baseOptions,
              cameraType: ImagePicker.CameraType.front,
            })
          : await ImagePicker.launchImageLibraryAsync(baseOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      const validation = validateProfileImage(asset, {
        maxFileSize: 8 * 1024 * 1024,
        maxDimensions: 6144,
        strictDimensions: false,
        strictFormat: false,
      });

      if (!validation.isValid) {
        Alert.alert('Invalid Image', validation.errors.join('\n'));
        return;
      }

      if (validation.warnings.length > 0) {
        console.log('⚠️ Profile image warnings:', validation.warnings);
      }

      await updateProfileImage(asset.uri);
      Alert.alert('Success', 'Profile picture updated successfully.');
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleProfileImagePress = () => {
    if (isUploadingImage) {
      return;
    }

    Alert.alert('Update Profile Picture', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Gallery', onPress: () => pickImage('library') },
    ]);
  };

  const getProfileImageUrl = () => {
    if (!profileImage) return null;
    if (profileImage.startsWith('file://')) {
      return profileImage;
    }
    return getSafeProfileImageUrl(profileImage);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header with Profile Image */}
      <LinearGradient
        colors={['#9b59b6', '#8e44ad']}
        style={styles.header}
      >
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={handleProfileImagePress}
            activeOpacity={0.8}
            disabled={isUploadingImage}
          >
            {getProfileImageUrl() ? (
              <Image
                key={profileImageRefreshKey}
                source={{ uri: getProfileImageUrl()! }}
                style={styles.profileImage}
                resizeMode="cover"
                onError={(error) => {
                  console.warn('Failed to load profile image:', error);
                }}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <FontAwesome name="building" size={40} color="#9b59b6" />
              </View>
            )}
            {isUploadingImage && (
              <View style={styles.imageUploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <View style={styles.editImageBadge}>
              <FontAwesome name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.profileName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.profileRole}>Facility Administrator</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <FontAwesome name="building" size={24} color="#9b59b6" />
          <Text style={styles.statValue}>
            {loadingFacilities ? '...' : facilitiesCount}
          </Text>
          <Text style={styles.statLabel}>Facilities</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="users" size={24} color="#3498db" />
          <Text style={styles.statValue}>
            {loadingStaff ? '...' : staffCount}
          </Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="shopping-cart" size={24} color="#e74c3c" />
          <Text style={styles.statValue}>-</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleEditProfile}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#e8d5f2' }]}>
              <FontAwesome name="user" size={18} color="#9b59b6" />
            </View>
            <Text style={styles.menuItemText}>Edit Profile</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setChangePasswordModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#ffe5e5' }]}>
              <FontAwesome name="lock" size={18} color="#e74c3c" />
            </View>
            <Text style={styles.menuItemText}>Change Password</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#fff3cd' }]}>
              <FontAwesome name="bell" size={18} color="#f39c12" />
            </View>
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#bdc3c7', true: '#9b59b6' }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setNotificationsSettingsModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#d5f4e6' }]}>
              <FontAwesome name="cog" size={18} color="#27ae60" />
            </View>
            <Text style={styles.menuItemText}>Notification Settings</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>
      </View>

      {/* Facility Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Facility Management</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(facility-tabs)/facilities')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#e8d5f2' }]}>
              <FontAwesome name="hospital-o" size={18} color="#9b59b6" />
            </View>
            <Text style={styles.menuItemText}>My Facilities</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(facility-tabs)/orders')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#ffe5e5' }]}>
              <FontAwesome name="list" size={18} color="#e74c3c" />
            </View>
            <Text style={styles.menuItemText}>Orders Management</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>
      </View>

      {/* Support & Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support & Information</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setHelpFAQModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#d5f4e6' }]}>
              <FontAwesome name="question-circle" size={18} color="#27ae60" />
            </View>
            <Text style={styles.menuItemText}>Help & FAQ</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setContactSupportModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
              <FontAwesome name="envelope" size={18} color="#3498db" />
            </View>
            <Text style={styles.menuItemText}>Contact Support</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setAboutPharmaLinkModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
              <FontAwesome name="info-circle" size={18} color="#9b59b6" />
            </View>
            <Text style={styles.menuItemText}>About PharmaLink</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#fadbd8' }]}>
              <FontAwesome name="sign-out" size={18} color="#e74c3c" />
            </View>
            <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
        onPasswordChanged={() => {
          setChangePasswordModalVisible(false);
        }}
      />

      <NotificationsSettingsModal
        visible={notificationsSettingsModalVisible}
        onClose={() => setNotificationsSettingsModalVisible(false)}
        onSettingsUpdated={() => {
          setNotificationsSettingsModalVisible(false);
        }}
      />

      <HelpFAQModal
        visible={helpFAQModalVisible}
        onClose={() => setHelpFAQModalVisible(false)}
      />

      <ContactSupportModal
        visible={contactSupportModalVisible}
        onClose={() => setContactSupportModalVisible(false)}
      />

      <AboutPharmaLinkModal
        visible={aboutPharmaLinkModalVisible}
        onClose={() => setAboutPharmaLinkModalVisible(false)}
      />

      <FacilityAdminEditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 120, // Add padding to prevent tab bar from covering logout button
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  imageUploadOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#fff',
  },
  logoutText: {
    color: '#e74c3c',
  },
});
