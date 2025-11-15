import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { facilitiesService, Facility } from '../../services/facilitiesService';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../constants/API';

export default function FacilitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to get facility image URL
  const getFacilityImageUrl = (facility: Facility): string | null => {
    if (facility?.images && facility.images.length > 0) {
      const imagePath = facility.images[0];
      
      // Convert relative path to full URL
      if (imagePath.startsWith('/uploads/')) {
        // Remove /api from BASE_URL for static file serving
        const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
        return `${baseUrl}${imagePath}`;
      }
      
      // If it's already a full URL, return as is
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      
      return imagePath;
    }
    return null;
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const response = await facilitiesService.getMyFacilities();
      if (response.success && response.data) {
        setFacilities(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to load facilities');
      }
    } catch (error: any) {
      console.error('Error loading facilities:', error);
      Alert.alert('Error', 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFacilities();
    setRefreshing(false);
  };

  const handleAddFacility = () => {
    Alert.alert(
      'Add Facility',
      'What type of facility would you like to add?',
      [
        { text: 'Pharmacy', onPress: () => router.push('/pharmacy-registration') },
        { text: 'Hospital', onPress: () => router.push('/hospital-registration') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9b59b6" />
        <Text style={styles.loadingText}>Loading facilities...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Facilities</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddFacility}
        >
          <FontAwesome name="plus" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {facilities.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="building-o" size={64} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>No facilities yet</Text>
          <Text style={styles.emptyText}>
            Start by adding your first pharmacy or hospital
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={handleAddFacility}
          >
            <Text style={styles.emptyAddButtonText}>Add Facility</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.facilitiesList}>
          {facilities.map((facility) => (
            <TouchableOpacity
              key={facility.id}
              style={styles.facilityCard}
              onPress={() => router.push({
                pathname: '/facility-management' as any,
                params: { id: facility.id, type: facility.type }
              })}
            >
              <View style={styles.facilityHeader}>
                <View style={styles.facilityImageContainer}>
                  {getFacilityImageUrl(facility) ? (
                    <Image
                      source={{ uri: getFacilityImageUrl(facility)! }}
                      style={styles.facilityImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.facilityIconContainer}>
                      <FontAwesome
                        name={facility.type === 'pharmacy' ? 'medkit' : 'hospital-o'}
                        size={24}
                        color="#9b59b6"
                      />
                    </View>
                  )}
                </View>
                <View style={styles.facilityInfo}>
                  <Text style={styles.facilityName}>{facility.name}</Text>
                  <Text style={styles.facilityType}>
                    {facility.type.charAt(0).toUpperCase() + facility.type.slice(1)}
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={18} color="#bdc3c7" />
              </View>
              
              {facility.address && (
                <View style={styles.facilityDetail}>
                  <FontAwesome name="map-marker" size={14} color="#7f8c8d" />
                  <Text style={styles.facilityDetailText} numberOfLines={1}>
                    {typeof facility.address === 'string' 
                      ? facility.address 
                      : facility.address?.street || facility.address?.city || ''}
                  </Text>
                </View>
              )}
              
              {facility.phone && (
                <View style={styles.facilityDetail}>
                  <FontAwesome name="phone" size={14} color="#7f8c8d" />
                  <Text style={styles.facilityDetailText}>{facility.phone}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9b59b6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyAddButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  facilitiesList: {
    padding: 20,
    gap: 16,
  },
  facilityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  facilityImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f3e5f5',
  },
  facilityImage: {
    width: '100%',
    height: '100%',
  },
  facilityIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  facilityType: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  facilityDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  facilityDetailText: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
});

