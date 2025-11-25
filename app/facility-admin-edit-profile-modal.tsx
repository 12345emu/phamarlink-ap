import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { getSafeProfileImageUrl } from '../utils/imageUtils';
import { validateProfileImage } from '../utils/imageValidation';

interface FacilityAdminEditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export default function FacilityAdminEditProfileModal({ 
  visible, 
  onClose, 
  onProfileUpdated 
}: FacilityAdminEditProfileModalProps) {
  const { user, updateUserProfile } = useAuth();
  const { profileImage, updateProfileImage } = useProfile();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  useEffect(() => {
    if (visible && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      
      // Reset image load error when modal opens
      setImageLoadError(false);
      setProfileImageUri(null);
    }
  }, [visible, user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const requestImagePermission = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access to update your profile picture.`,
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

  const pickImage = async () => {
    try {
      const hasPermission = await requestImagePermission('library');
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate image
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

        setProfileImageUri(asset.uri);
        setImageLoadError(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestImagePermission('camera');
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        exif: false,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate image
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

        setProfileImageUri(asset.uri);
        setImageLoadError(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Profile Image',
      'Choose how you want to add your profile image',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Update profile data
      await updateUserProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });

      // Update profile image if changed
      if (profileImageUri && profileImageUri !== profileImage) {
        await updateProfileImage(profileImageUri);
      }

      Alert.alert('Success', 'Profile updated successfully');
      onProfileUpdated();
      onClose();
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      const errorMessage = error.message || 'Failed to update profile. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getProfileImageUrl = () => {
    // If there was an image load error, don't try to load the image again
    if (imageLoadError) {
      return null;
    }
    
    // Priority 1: Use profileImageUri if it's a valid local file path (for new selections)
    if (profileImageUri && !profileImageUri.startsWith('http')) {
      return profileImageUri;
    }
    
    // Priority 2: Use profileImageUri if it's a valid network URL (for new selections)
    if (profileImageUri && profileImageUri.startsWith('http')) {
      return profileImageUri;
    }
    
    // Priority 3: Use profileImage from context (existing uploaded image)
    if (profileImage) {
      // Handle local file URIs directly, use getSafeProfileImageUrl for network URLs
      if (profileImage.startsWith('file://')) {
        return profileImage;
      } else {
        return getSafeProfileImageUrl(profileImage);
      }
    }
    
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#9b59b6', '#8e44ad']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={handleSave} 
              style={styles.saveButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Image Section */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity onPress={showImageOptions} style={styles.profileImageContainer}>
              {(() => {
                const imageUrl = getProfileImageUrl();
                
                if (imageUrl) {
                  return (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.profileImage}
                      onError={(error) => {
                        console.warn('❌ Failed to load profile image:', error);
                        setImageLoadError(true);
                      }}
                      onLoad={() => {
                        console.log('✅ Profile image loaded successfully');
                      }}
                    />
                  );
                } else {
                  return (
                    <View style={styles.profileImagePlaceholder}>
                      <FontAwesome name="building" size={40} color="#9b59b6" />
                    </View>
                  );
                }
              })()}
              <View style={styles.editImageButton}>
                <FontAwesome name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileImageText}>Tap to change profile image</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                placeholder="Enter your first name"
                placeholderTextColor="#95a5a6"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                placeholder="Enter your last name"
                placeholderTextColor="#95a5a6"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                placeholderTextColor="#95a5a6"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                placeholder="Enter your phone number"
                placeholderTextColor="#95a5a6"
                keyboardType="phone-pad"
              />
            </View>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8d5f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImageText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    color: '#2c3e50',
  },
});

