import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image, Modal, Linking, RefreshControl } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { facilitiesService, Facility } from '../../services/facilitiesService';
import { useFavorites } from '../../context/FavoritesContext';
import { API_CONFIG } from '../../constants/API';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const GLASS_BG = 'rgba(255,255,255,0.7)';

// Using the Facility interface from facilitiesService
type Pharmacy = Facility;

// Get facility image URL
const getFacilityImageUrl = (facility: Facility) => {
  console.log('🔍 Pharmacies page - getFacilityImageUrl called for facility:', facility?.name);
  console.log('📊 Pharmacies page - Facility images:', facility?.images);
  
  if (facility?.images && facility.images.length > 0) {
    // Return the first image from the array
    const imagePath = facility.images[0];
    console.log('🖼️ Pharmacies page - Image path:', imagePath);
    
    // Convert relative path to full URL
    if (imagePath.startsWith('/uploads/')) {
      // Remove /api from BASE_URL for static file serving
      const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
      const fullUrl = `${baseUrl}${imagePath}`;
      console.log('✅ Pharmacies page - Constructed URL:', fullUrl);
      return fullUrl;
    }
    console.log('🌐 Pharmacies page - External URL:', imagePath);
    return imagePath;
  }
  // Fallback to default pharmacy image
  console.log('⚠️ Pharmacies page - No images found, using fallback');
  return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80';
};

export default function PharmaciesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { toggleFavorite: toggleFavoriteFacility, isFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState(params.searchQuery as string || '');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'hospitals'>('pharmacies');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterInsurance, setFilterInsurance] = useState(false);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  
  const [facilities, setFacilities] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      await getCurrentLocation();
      // Fetch data after getting location
      setTimeout(() => {
        fetchFacilities();
      }, 1000); // Small delay to ensure location is set
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    if (params.searchQuery) {
      setSearchQuery(params.searchQuery as string);
    }
  }, [params.searchQuery]);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching facilities from API...');
      
      if (!userLocation) {
        console.log('📍 No user location available, using default coordinates');
        // Use Accra coordinates as fallback
        const response = await facilitiesService.searchNearby({
          latitude: 5.5600,
          longitude: -0.2057,
          radius: 50, // 50km radius
          limit: 50
        });
        
        console.log('🔍 Raw facilities response (fallback):', JSON.stringify(response, null, 2));
        
        if (response.success && response.data) {
          console.log('✅ Facilities fetched successfully:', response.data.length);
          console.log('📊 Facilities data (fallback):', JSON.stringify(response.data, null, 2));
          
          // Debug distance values
          console.log('🔍 Distance debugging (fallback):');
          response.data.forEach((facility, index) => {
            console.log(`${index + 1}. ${facility.name}: distance = ${facility.distance} km (type: ${typeof facility.distance})`);
          });
          
          setFacilities(response.data);
        } else {
          console.error('❌ Failed to fetch facilities:', response.message);
          setError(response.message || 'Failed to fetch facilities');
        }
      } else {
        console.log('📍 Using user location:', userLocation.coords.latitude, userLocation.coords.longitude);
        const response = await facilitiesService.searchNearby({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          radius: 50, // 50km radius
          limit: 50
        });
        
        console.log('🔍 Raw facilities response (user location):', JSON.stringify(response, null, 2));
        
        if (response.success && response.data) {
          console.log('✅ Facilities fetched successfully:', response.data.length);
          console.log('📊 Facilities data (user location):', JSON.stringify(response.data, null, 2));
          
          // Debug distance values
          console.log('🔍 Distance debugging:');
          response.data.forEach((facility, index) => {
            console.log(`${index + 1}. ${facility.name}: distance = ${facility.distance} km (type: ${typeof facility.distance})`);
          });
          
          setFacilities(response.data);
        } else {
          console.error('❌ Failed to fetch facilities:', response.message);
          setError(response.message || 'Failed to fetch facilities');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching facilities:', error);
      setError('Failed to fetch facilities');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to find nearby places.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing pharmacies data...');
      // Get fresh location and fetch facilities
      await getCurrentLocation();
      await fetchFacilities();
      console.log('✅ Refresh completed successfully');
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      Alert.alert('Refresh Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToDetails = (item: Pharmacy) => {
    const addressString = `${item.address.street}, ${item.address.city}, ${item.address.state}`;
    const distanceString = item.distance ? `${item.distance.toFixed(1)} km` : 'N/A';
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : '';
    
    if (activeTab === 'pharmacies') {
      router.push({
        pathname: '/pharmacy-details-modal',
        params: {
          id: item.id.toString(),
          pharmacyName: item.name,
          pharmacyAddress: addressString,
          pharmacyDistance: distanceString,
          pharmacyRating: item.rating.toString(),
          pharmacyOpen: item.isOpen.toString(),
          phone: item.phone,
          pharmacyImage: imageUrl,
          latitude: item.coordinates.latitude.toString(),
          longitude: item.coordinates.longitude.toString(),
        }
      });
    } else {
      router.push({
        pathname: '/hospital-details-modal',
        params: {
          id: item.id.toString(),
          hospitalName: item.name,
          hospitalAddress: addressString,
          hospitalDistance: distanceString,
          hospitalRating: item.rating.toString(),
          hospitalOpen: item.isOpen.toString(),
          phone: item.phone,
          hospitalImage: imageUrl,
          latitude: item.coordinates.latitude.toString(),
          longitude: item.coordinates.longitude.toString(),
        }
      });
    }
  };

  const handleToggleFavorite = async (item: Pharmacy) => {
    try {
      await toggleFavoriteFacility({
        id: item.id.toString(),
        name: item.name,
        type: item.type as 'pharmacy' | 'hospital' | 'clinic',
        address: item.address,
        phone: item.phone,
        rating: item.rating,
        distance: item.distance,
        image: item.images && item.images.length > 0 ? item.images[0] : undefined,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  };

  const callPlace = async (phone: string, facilityName: string) => {
    Alert.alert(
      'Call Facility',
      `Would you like to call ${facilityName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: async () => {
            try {
              // Check if the device can make phone calls
              const canOpen = await Linking.canOpenURL(`tel:${phone}`);
              if (canOpen) {
                await Linking.openURL(`tel:${phone}`);
              } else {
                Alert.alert(
                  'Cannot Make Call',
                  'Your device cannot make phone calls. Please try calling manually.',
                  [
                    { text: 'Copy Number', onPress: () => {
                      Alert.alert('Phone Number', `Phone number: ${phone}`);
                    }},
                    { text: 'OK', style: 'cancel' }
                  ]
                );
              }
            } catch (error) {
              console.error('Error making phone call:', error);
              Alert.alert('Error', 'Failed to make phone call. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getDirections = async (item: Pharmacy) => {
    try {
      const { latitude, longitude } = item.coordinates;
      const facilityName = encodeURIComponent(item.name);
      
      // Create Google Maps URL for directions
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${facilityName}`;
      
      // Check if the device can open Google Maps
      const canOpen = await Linking.canOpenURL(mapsUrl);
      if (canOpen) {
        await Linking.openURL(mapsUrl);
      } else {
        // Fallback to general maps URL
        const fallbackUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
        } else {
          Alert.alert(
            'Cannot Open Maps',
            'No maps application found on your device. Please install Google Maps or another maps app.',
            [
              { text: 'Copy Coordinates', onPress: () => {
                Alert.alert('Coordinates', `Latitude: ${latitude}\nLongitude: ${longitude}`);
              }},
              { text: 'OK', style: 'cancel' }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert('Error', 'Failed to open directions. Please try again.');
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? 'star' : 'star-o'}
          size={12}
          color={i <= rating ? '#FFD700' : '#ddd'}
          style={{ marginRight: 1 }}
        />
      );
    }
    return stars;
  };

  const getFilteredAndSortedItems = () => {
    // Safety check: ensure we have an array before calling filter
    if (!facilities || !Array.isArray(facilities)) {
      return [];
    }
    
    // Filter by facility type based on active tab
    const facilityType = activeTab === 'pharmacies' ? 'pharmacy' : 'hospital';
    let items = facilities.filter(item => item.type === facilityType);
    
    // Filter by search query
    items = items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${item.address.street} ${item.address.city} ${item.address.state}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filters
    if (filterOpen) {
      items = items.filter(item => item.isOpen);
    }
    
    // Filter by favorites
    if (filterFavorites) {
      items = items.filter(item => isFavorite(item.id.toString()));
    }
    
    // Note: These filters would need to be implemented based on actual facility data
    // For now, we'll skip them since the Facility interface doesn't have these properties
    // if (filterDelivery) {
    //   items = items.filter(item => item.deliveryAvailable);
    // }
    // if (filterInsurance) {
    //   items = items.filter(item => item.insuranceAccepted);
    // }
    // if (filterEmergency) {
    //   items = items.filter(item => item.emergencyServices);
    // }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return items;
  };

  const filteredItems = getFilteredAndSortedItems();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    tabContainer: {
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: '#fff',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: '#ecf0f1',
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: ACCENT,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#7f8c8d',
    },
    activeTabText: {
      color: '#fff',
    },
    searchSection: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: '#fff',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: '#2c3e50',
    },
    filterButton: {
      padding: 8,
    },
    filterOptions: {
      marginTop: 16,
    },
    filterChip: {
      backgroundColor: '#ecf0f1',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 12,
    },
    activeFilterChip: {
      backgroundColor: ACCENT,
    },
    filterChipText: {
      fontSize: 14,
      color: '#7f8c8d',
      fontWeight: '500',
    },
    activeFilterChipText: {
      color: '#fff',
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
    sortLabel: {
      fontSize: 14,
      color: '#7f8c8d',
      marginRight: 12,
    },
    sortButton: {
      backgroundColor: '#ecf0f1',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
    },
    activeSortButton: {
      backgroundColor: ACCENT,
    },
    sortButtonText: {
      fontSize: 12,
      color: '#7f8c8d',
      fontWeight: '500',
    },
    activeSortButtonText: {
      color: '#fff',
    },
    itemsList: {
      flex: 1,
      paddingHorizontal: 20,
    },
    itemCard: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    itemImageContainer: {
      width: 60,
      height: 60,
      borderRadius: 12,
      marginRight: 16,
      overflow: 'hidden',
      backgroundColor: '#f8f9fa',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: 4,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    itemType: {
      fontSize: 14,
      color: '#7f8c8d',
      marginRight: 12,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: 12,
      color: '#7f8c8d',
      marginLeft: 4,
    },
    itemAddress: {
      fontSize: 14,
      color: '#7f8c8d',
      marginBottom: 2,
    },
    itemHours: {
      fontSize: 12,
      color: '#95a5a6',
    },
    favoriteButton: {
      padding: 8,
    },
    itemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemDistance: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    distanceText: {
      fontSize: 14,
      color: '#7f8c8d',
      fontWeight: '500',
      marginLeft: 4,
    },
    itemServices: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    serviceBadge: {
      backgroundColor: ACCENT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    serviceText: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '600',
      marginLeft: 4,
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#f8f9fa',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pharmacies' && styles.activeTab]}
            onPress={() => setActiveTab('pharmacies')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'pharmacies' && styles.activeTabText]}>
              Pharmacies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'hospitals' && styles.activeTab]}
            onPress={() => setActiveTab('hospitals')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'hospitals' && styles.activeTabText]}>
              Hospitals
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <FontAwesome name="filter" size={18} color={showFilters ? ACCENT : "#95a5a6"} />
          </TouchableOpacity>
        </View>

        {/* Filter Options */}
        {showFilters && (
          <View style={styles.filterOptions}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.filterChip, filterOpen && styles.activeFilterChip]}
                onPress={() => setFilterOpen(!filterOpen)}
              >
                <Text style={[styles.filterChipText, filterOpen && styles.activeFilterChipText]}>
                  Open Now
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, filterDelivery && styles.activeFilterChip]}
                onPress={() => setFilterDelivery(!filterDelivery)}
              >
                <Text style={[styles.filterChipText, filterDelivery && styles.activeFilterChipText]}>
                  Delivery
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, filterInsurance && styles.activeFilterChip]}
                onPress={() => setFilterInsurance(!filterInsurance)}
              >
                <Text style={[styles.filterChipText, filterInsurance && styles.activeFilterChipText]}>
                  Insurance
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, filterEmergency && styles.activeFilterChip]}
                onPress={() => setFilterEmergency(!filterEmergency)}
              >
                <Text style={[styles.filterChipText, filterEmergency && styles.activeFilterChipText]}>
                  Emergency
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'distance' && styles.activeSortButton]}
                onPress={() => setSortBy('distance')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'distance' && styles.activeSortButtonText]}>
                  Distance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'rating' && styles.activeSortButton]}
                onPress={() => setSortBy('rating')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.activeSortButtonText]}>
                  Rating
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'name' && styles.activeSortButton]}
                onPress={() => setSortBy('name')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'name' && styles.activeSortButtonText]}>
                  Name
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Items List */}
      <ScrollView 
        style={styles.itemsList} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3498db']}
            tintColor="#3498db"
          />
        }
      >
        {loading && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
            <Text>Loading facilities...</Text>
          </View>
        )}
        
        {!loading && filteredItems.length === 0 && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
            <Text style={{ textAlign: 'center', color: '#7f8c8d', marginBottom: 10 }}>
              No {activeTab} found nearby
            </Text>
            <Text style={{ textAlign: 'center', color: '#95a5a6', fontSize: 12 }}>
              Try expanding your search radius or check back later
            </Text>
          </View>
        )}
        
        {!loading && filteredItems.length > 0 && filteredItems.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.itemCard,
              index === filteredItems.length - 1 && { marginBottom: 100 }
            ]}
            onPress={() => navigateToDetails(item)}
            activeOpacity={0.7}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemImageContainer}>
                <Image 
                  source={{ uri: getFacilityImageUrl(item) }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemType}>
                    {activeTab === 'pharmacies' ? 'Pharmacy' : 'Hospital'}
                  </Text>
                  <View style={styles.ratingContainer}>
                    {renderStars(item.rating)}
                    <Text style={styles.ratingText}>({item.rating})</Text>
                  </View>
                </View>
                <Text style={styles.itemAddress}>{`${item.address.street}, ${item.address.city}, ${item.address.state}`}</Text>
                <Text style={styles.itemHours}>Open: 9 AM - 5 PM</Text>
              </View>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => handleToggleFavorite(item)}
                activeOpacity={0.7}
              >
                <FontAwesome 
                  name={isFavorite(item.id.toString()) ? "heart" : "heart-o"} 
                  size={18} 
                  color={isFavorite(item.id.toString()) ? "#e74c3c" : "#95a5a6"} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.itemFooter}>
              <View style={styles.itemDistance}>
                <FontAwesome name="map-marker" size={14} color="#95a5a6" />
                <Text style={styles.distanceText}>
                  {item.distance !== undefined && item.distance !== null 
                    ? `${item.distance.toFixed(1)} km` 
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.itemServices}>
                {/* Service badges would be implemented based on actual facility data */}
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => callPlace(item.phone, item.name)}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="phone" size={14} color={ACCENT} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => getDirections(item)}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="map-marker" size={14} color={ACCENT} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}