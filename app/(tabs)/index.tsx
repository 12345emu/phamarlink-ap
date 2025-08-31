import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput, Animated, Alert, RefreshControl } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { facilitiesService, Facility } from '../../services/facilitiesService';
import { medicinesService, Medicine } from '../../services/medicinesService';
import { professionalsService, HealthcareProfessional } from '../../services/professionalsService';

type FontAwesomeIconName = keyof typeof FontAwesome.glyphMap;

const { width } = Dimensions.get('window');

export default function HomeScreen(props: any) {
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [availableProfessionals, setAvailableProfessionals] = useState<HealthcareProfessional[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [medicinesLoading, setMedicinesLoading] = useState(false);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const router = useRouter();

  // Filter nearby options based on search query
  const filteredNearbyOptions = nearbyFacilities.filter(option =>
    option.name.toLowerCase().includes(search.toLowerCase()) ||
    option.type.toLowerCase().includes(search.toLowerCase()) ||
    option.services.some(service => 
      service.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Debug logging
  console.log('🔍 nearbyFacilities state:', nearbyFacilities.length, 'facilities');
  console.log('🔍 filteredNearbyOptions:', filteredNearbyOptions.length, 'facilities');

  // Filter medicines based on search query
  const filteredMedicines = availableMedicines.filter(medicine =>
    medicine.name.toLowerCase().includes(search.toLowerCase()) ||
    medicine.category.toLowerCase().includes(search.toLowerCase()) ||
    medicine.generic_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Filter professionals based on search query
  const filteredProfessionals = availableProfessionals.filter(professional =>
    professional.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    professional.specialty.toLowerCase().includes(search.toLowerCase())
  );

  // Fetch available medicines
  const fetchAvailableMedicines = async () => {
    try {
      setMedicinesLoading(true);
      const response = await medicinesService.getAvailableMedicines(10);
      
      if (response.success && response.data) {
        console.log('💊 Fetched medicines:', response.data.length, 'medicines');
        setAvailableMedicines(response.data);
      } else {
        console.error('Failed to fetch medicines:', response.message);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setMedicinesLoading(false);
    }
  };

  // Fetch available professionals
  const fetchAvailableProfessionals = async () => {
    try {
      setProfessionalsLoading(true);
      const response = await professionalsService.getAvailableProfessionals(5);
      
      if (response.success && response.data) {
        console.log('👨‍⚕️ Fetched professionals:', response.data.length, 'professionals');
        setAvailableProfessionals(response.data);
      } else {
        console.error('Failed to fetch professionals:', response.message);
      }
    } catch (error) {
      console.error('Error fetching professionals:', error);
    } finally {
      setProfessionalsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show nearby places.');
        return;
      }
      
      setLocationPermission(true);
      
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      
      // Fetch nearby facilities
      await fetchNearbyFacilities(location.coords.latitude, location.coords.longitude);
      
      // Fetch medicines and professionals
      await Promise.all([
        fetchAvailableMedicines(),
        fetchAvailableProfessionals()
      ]);
    })();
  }, []);

  const fetchNearbyFacilities = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching nearby facilities...');
      
      const response = await facilitiesService.searchNearby({
        latitude,
        longitude,
        radius: 10, // 10km radius
        limit: 10,
      });

      // Response received successfully

      if (response.success && response.data) {
        console.log('🔍 Setting nearby facilities:', response.data.length, 'facilities');
        setNearbyFacilities(response.data);
      } else {
        console.error('Failed to fetch nearby facilities:', response.message);
        // Fallback to sample data if API fails
        console.log('🔍 Falling back to sample data');
        setNearbyFacilities(getSampleFacilities());
      }
    } catch (error) {
      console.error('Error fetching nearby facilities:', error);
      // Fallback to sample data on error
      console.log('🔍 Falling back to sample data due to error');
      setNearbyFacilities(getSampleFacilities());
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (userLocation) {
        await fetchNearbyFacilities(userLocation.coords.latitude, userLocation.coords.longitude);
      }
      await Promise.all([
        fetchAvailableMedicines(),
        fetchAvailableProfessionals()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fallback sample data
  const getSampleFacilities = (): Facility[] => [
    {
      id: '1',
      name: 'Holy Family Hospital',
      type: 'hospital',
      description: 'A leading healthcare facility',
      address: {
        street: '123 Hospital Road',
        city: 'Accra',
        state: 'Greater Accra',
        zipCode: '00233',
        country: 'Ghana',
      },
      coordinates: {
        latitude: 5.5600,
        longitude: -0.2057,
      },
      phone: '+233 20 123 4567',
      services: ['Emergency Care', 'Surgery', 'Maternity', 'Pediatrics'],
      specialties: ['Cardiology', 'Neurology', 'Orthopedics'],
      rating: 4.5,
      reviewCount: 128,
      isOpen: true,
      distance: 2.1,
      amenities: ['Parking', 'Cafeteria', 'WiFi'],
      emergencyServices: true,
      operatingHours: {
        monday: { open: '08:00', close: '18:00', isOpen: true },
        tuesday: { open: '08:00', close: '18:00', isOpen: true },
        wednesday: { open: '08:00', close: '18:00', isOpen: true },
        thursday: { open: '08:00', close: '18:00', isOpen: true },
        friday: { open: '08:00', close: '18:00', isOpen: true },
        saturday: { open: '09:00', close: '17:00', isOpen: true },
        sunday: { open: '09:00', close: '17:00', isOpen: true },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'CityMed Pharmacy',
      type: 'pharmacy',
      description: 'Your trusted neighborhood pharmacy',
      address: {
        street: '456 Pharmacy Street',
        city: 'Accra',
        state: 'Greater Accra',
        zipCode: '00233',
        country: 'Ghana',
      },
      coordinates: {
        latitude: 5.5650,
        longitude: -0.2100,
      },
      phone: '+233 20 987 6543',
      services: ['Prescription Filling', 'Over-the-counter', 'Health Consultations'],
      rating: 4.2,
      reviewCount: 89,
      isOpen: true,
      distance: 1.2,
      amenities: ['Parking', 'Consultation Room'],
      emergencyServices: false,
      operatingHours: {
        monday: { open: '08:00', close: '20:00', isOpen: true },
        tuesday: { open: '08:00', close: '20:00', isOpen: true },
        wednesday: { open: '08:00', close: '20:00', isOpen: true },
        thursday: { open: '08:00', close: '20:00', isOpen: true },
        friday: { open: '08:00', close: '20:00', isOpen: true },
        saturday: { open: '09:00', close: '18:00', isOpen: true },
        sunday: { open: '10:00', close: '16:00', isOpen: true },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'East Legon Clinic',
      type: 'clinic',
      description: 'Specialized medical clinic',
      address: {
        street: '789 Clinic Avenue',
        city: 'Accra',
        state: 'Greater Accra',
        zipCode: '00233',
        country: 'Ghana',
      },
      coordinates: {
        latitude: 5.5550,
        longitude: -0.2000,
      },
      phone: '+233 20 555 1234',
      services: ['General Consultation', 'Specialized Care', 'Laboratory'],
      specialties: ['Dermatology', 'Gynecology'],
      rating: 4.0,
      reviewCount: 67,
      isOpen: true,
      distance: 3.4,
      amenities: ['Parking', 'Laboratory'],
      emergencyServices: false,
      operatingHours: {
        monday: { open: '08:00', close: '17:00', isOpen: true },
        tuesday: { open: '08:00', close: '17:00', isOpen: true },
        wednesday: { open: '08:00', close: '17:00', isOpen: true },
        thursday: { open: '08:00', close: '17:00', isOpen: true },
        friday: { open: '08:00', close: '17:00', isOpen: true },
        saturday: { open: '09:00', close: '15:00', isOpen: true },
        sunday: { open: '09:00', close: '15:00', isOpen: true },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const handleProfilePress = () => {
    if (props.goToProfile) {
      props.goToProfile();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  const getMapRegion = () => {
    if (userLocation) {
      return {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    // Default to Accra, Ghana if no user location
    return {
      latitude: 5.5600,
      longitude: -0.2057,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };

  const getFacilityIcon = (type: Facility['type']): FontAwesomeIconName => {
    switch (type) {
      case 'hospital':
        return 'hospital-o';
      case 'pharmacy':
        return 'medkit';
      case 'clinic':
        return 'map-marker';
      default:
        return 'building';
    }
  };

  const getFacilityIconColor = (type: Facility['type']): string => {
    switch (type) {
      case 'hospital':
        return '#e74c3c';
      case 'pharmacy':
        return '#3498db';
      case 'clinic':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getFacilityTypeDisplayName = (type: Facility['type']): string => {
    return facilitiesService.getFacilityTypeDisplayName(type);
  };

  // Get facility image URL
  const getFacilityImageUrl = (facility: Facility) => {
    if (facility?.images && facility.images.length > 0) {
      // Return the first image from the array
      const imagePath = facility.images[0];
      // Convert relative path to full URL
      if (imagePath.startsWith('/uploads/')) {
        return `http://172.20.10.3:3000${imagePath}`;
      }
      return imagePath;
    }
    // Fallback to default pharmacy image
    return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80';
  };

  const formatDistance = (distance: number): string => {
    return facilitiesService.formatDistance(distance);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
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
        {/* Location Card */}
        <View style={styles.locationCard}>
          <FontAwesome name="map-marker" size={16} color="#e74c3c" />
          <Text style={styles.locationText}>Your Location: Accra, Ghana</Text>
            </View>

        {/* Search Bar */}
        <View style={styles.searchCard}>
          <FontAwesome name="search" size={18} color="#95a5a6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Pharmacy or Hospital"
            placeholderTextColor="#95a5a6"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <FontAwesome name="times-circle" size={18} color="#95a5a6" />
            </TouchableOpacity>
          )}
        </View>

        {/* Nearby Options Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby options</Text>
            <TouchableOpacity 
              style={[styles.reloadButton, loading && styles.reloadButtonDisabled]}
              onPress={() => {
                if (userLocation && !loading) {
                  fetchNearbyFacilities(userLocation.coords.latitude, userLocation.coords.longitude);
                }
              }}
              disabled={loading}
              activeOpacity={0.7}
            >
              <FontAwesome 
                name={loading ? "spinner" : "refresh"} 
                size={16} 
                color={loading ? "#95a5a6" : "#3498db"} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.nearbyList}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading nearby facilities...</Text>
              </View>
            ) : nearbyFacilities.length === 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="map-marker" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No nearby facilities found</Text>
              </View>
            ) : filteredNearbyOptions.length === 0 && search.length > 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="search" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No nearby places found</Text>
              </View>
            ) : (
              filteredNearbyOptions.map((facility) => (
              <TouchableOpacity 
                  key={facility.id} 
                style={styles.nearbyItem}
                onPress={() => {
                  const addressString = `${facility.address.street}, ${facility.address.city}, ${facility.address.state}`;
                  const distanceString = facility.distance ? `${facility.distance.toFixed(1)} km` : 'N/A';
                  const imageUrl = facility.images && facility.images.length > 0 ? facility.images[0] : '';
                  
                  if (facility.type === 'hospital' || facility.type === 'clinic') {
                    router.push({
                      pathname: '/hospital-details-modal',
                      params: {
                          id: facility.id.toString(),
                          hospitalName: facility.name,
                          hospitalAddress: addressString,
                          hospitalDistance: distanceString,
                          hospitalRating: facility.rating.toString(),
                          hospitalOpen: facility.isOpen.toString(),
                          phone: facility.phone,
                          hospitalImage: imageUrl,
                          latitude: facility.coordinates.latitude.toString(),
                          longitude: facility.coordinates.longitude.toString(),
                      }
                    });
                  } else {
                    router.push({
                      pathname: '/pharmacy-details-modal',
                      params: {
                          id: facility.id.toString(),
                          pharmacyName: facility.name,
                          pharmacyAddress: addressString,
                          pharmacyDistance: distanceString,
                          pharmacyRating: facility.rating.toString(),
                          pharmacyOpen: facility.isOpen.toString(),
                          phone: facility.phone,
                          pharmacyImage: imageUrl,
                          latitude: facility.coordinates.latitude.toString(),
                          longitude: facility.coordinates.longitude.toString(),
                      }
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                  <View style={styles.nearbyImageContainer}>
                    <Image 
                      source={{ uri: getFacilityImageUrl(facility) }}
                      style={styles.nearbyImage}
                      resizeMode="cover"
                    />
                  </View>
                <View style={styles.nearbyInfo}>
                    <Text style={styles.nearbyName}>{facility.name}</Text>
                    <Text style={styles.nearbyType}>{getFacilityTypeDisplayName(facility.type)}</Text>
                </View>
                <View style={styles.nearbyRight}>
                    <Text style={styles.nearbyDistance}>
                      {facility.distance ? formatDistance(facility.distance) : 'N/A'}
                    </Text>
                  <FontAwesome name="angle-right" size={16} color="#95a5a6" />
                </View>
              </TouchableOpacity>
            ))
            )}
          </View>
        </View>
        
        {/* Map Preview */}
        <View style={styles.mapPreview}>
          <MapView
            style={styles.map}
            initialRegion={getMapRegion()}
            showsUserLocation={locationPermission}
            showsMyLocationButton={locationPermission}
            showsCompass={true}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            mapType="standard"
          >
            {/* User Location Marker */}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.coords.latitude,
                  longitude: userLocation.coords.longitude,
                }}
                title="Your Location"
                description="You are here"
                pinColor="#43e97b"
              />
            )}
            
            {/* Facility Markers */}
            {nearbyFacilities.map((facility) => (
            <Marker
                key={facility.id}
              coordinate={{
                  latitude: facility.coordinates.latitude,
                  longitude: facility.coordinates.longitude,
              }}
                title={facility.name}
                description={`${getFacilityTypeDisplayName(facility.type)} • ${facility.distance ? formatDistance(facility.distance) : 'N/A'}`}
                pinColor={getFacilityIconColor(facility.type)}
              />
            ))}
          </MapView>
          <View style={styles.mapOverlay}>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => router.push('/(tabs)/pharmacies')}
              activeOpacity={0.8}
            >
              <FontAwesome name="map" size={16} color="#3498db" />
              <Text style={styles.mapButtonText}>View Full Map</Text>
            </TouchableOpacity>
          </View>
                    </View>

        {/* Order Medicine Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Medicine</Text>
          <View style={styles.orderList}>
            {medicinesLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading medicines...</Text>
              </View>
            ) : filteredMedicines.length === 0 && search.length > 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="search" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No medicines found</Text>
              </View>
            ) : filteredMedicines.length === 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="medkit" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No medicines available</Text>
              </View>
            ) : (
              filteredMedicines.slice(0, 5).map((medicine, index) => (
                <View key={medicine.id} style={styles.orderItem}>
                <View style={styles.orderLeft}>
                    <View style={[styles.orderIcon, { backgroundColor: medicinesService.getMedicineColor(medicine.category || 'default') + '20' }]}>
                      <FontAwesome name={medicinesService.getMedicineIcon(medicine.category || 'default') as FontAwesomeIconName} size={18} color={medicinesService.getMedicineColor(medicine.category || 'default')} />
                    </View>
                  <View style={styles.orderInfo}>
                      <Text style={styles.orderName}>{medicine.name || 'Unknown Medicine'}</Text>
                      <Text style={styles.orderPrice}>
                        {medicinesService.formatPriceRange(medicine.min_price, medicine.max_price)}
                        {medicine.prescription_required && (
                          <Text style={{ color: '#e74c3c', fontSize: 12 }}> • Prescription Required</Text>
                        )}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#7f8c8d' }}>
                        {medicine.category || 'General'} • {medicine.available_facilities || 0} facilities
                      </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.orderButton} 
                  activeOpacity={0.7}
                  onPress={() => {
                      router.push({
                        pathname: '/medicine-details-modal',
                        params: {
                          medicineId: medicine.id.toString(),
                          medicineName: medicine.name,
                          genericName: medicine.generic_name || '',
                          category: medicine.category,
                          prescriptionRequired: medicine.prescription_required.toString(),
                          dosageForm: medicine.dosage_form || '',
                          strength: medicine.strength || '',
                          description: medicine.description || '',
                          manufacturer: medicine.manufacturer || '',
                          stockQuantity: (medicine.avg_stock ?? 0).toString(),
                          price: (medicine.min_price ?? 0).toString(),
                          isAvailable: ((medicine.avg_stock ?? 0) > 0).toString(),
                          medicineImage: '' // API doesn't provide images
                        }
                      });
                    }}
                  >
                    <Text style={styles.orderButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Book Appointment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book Appointment</Text>
          <View style={styles.orderList}>
            {professionalsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading professionals...</Text>
              </View>
            ) : filteredProfessionals.length === 0 && search.length > 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="search" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No professionals found</Text>
              </View>
            ) : filteredProfessionals.length === 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="user-md" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No professionals available</Text>
              </View>
            ) : (
              filteredProfessionals.slice(0, 3).map((professional, index) => (
                <View key={professional.id} style={styles.orderItem}>
                  <View style={styles.orderLeft}>
                    <View style={[styles.orderIcon, { backgroundColor: professionalsService.getProfessionalColor(professional.specialty || 'default') + '20' }]}>
                      <FontAwesome name={professionalsService.getProfessionalIcon(professional.specialty || 'default') as FontAwesomeIconName} size={18} color={professionalsService.getProfessionalColor(professional.specialty || 'default')} />
                    </View>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderName}>{professional.full_name || 'Unknown Professional'}</Text>
                      <Text style={styles.orderPrice}>
                        {professional.specialty || 'General'} • {professional.experience_text || 'No experience listed'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <FontAwesome name="star" size={12} color="#f39c12" />
                        <Text style={{ fontSize: 12, color: '#7f8c8d', marginLeft: 4 }}>
                          {professionalsService.formatRating(professional.rating || 0)} ({professional.total_reviews || 0} reviews)
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.orderButton, !professional.is_available && { backgroundColor: '#95a5a6' }]} 
                    activeOpacity={0.7}
                    onPress={() => {
                      if (professional.is_available) {
                        router.push({
                          pathname: '/appointment-booking-modal',
                          params: {
                            professionalId: professional.id.toString(),
                            professionalName: professional.full_name,
                            professionalSpecialty: professional.specialty,
                            professionalRating: professional.rating?.toString() || '0',
                            professionalExperience: professional.experience_text,
                            facilityId: professional.facility_id?.toString() || '',
                            facilityName: professional.facility_name || 'General Practice'
                          }
                        });
                      }
                    }}
                >
                    <Text style={styles.orderButtonText}>
                      {professional.is_available ? 'Book Now' : 'Unavailable'}
                    </Text>
                </TouchableOpacity>
              </View>
            ))
            )}
          </View>
            </View>

        {/* Chat with Professional Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat with a Professional</Text>
          <View style={styles.chatList}>
            {professionalsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading professionals...</Text>
              </View>
            ) : filteredProfessionals.length === 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="user-md" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No professionals available</Text>
              </View>
            ) : (
              filteredProfessionals.slice(0, 3).map((professional, index) => (
              <TouchableOpacity 
                  key={professional.id} 
                  style={[
                    styles.chatItem, 
                    !professional.is_available && styles.chatItemUnavailable,
                    index === filteredProfessionals.slice(0, 3).length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => professional.is_available ? router.push({
                    pathname: '/(tabs)/chat',
                    params: {
                      professionalId: professional.id.toString(),
                      professionalName: professional.full_name,
                      professionalRole: professional.specialty.toLowerCase().includes('pharmacist') ? 'pharmacist' : 'doctor',
                      facilityName: professional.facility_name || 'General Practice',
                      professionalSpecialty: professional.specialty,
                      professionalAvatar: professionalsService.getProfessionalIcon(professional.specialty),
                      professionalRating: professional.rating.toString(),
                      professionalExperience: professional.experience_years.toString()
                    }
                  }) : null}
                  activeOpacity={professional.is_available ? 0.7 : 1}
              >
                  <View style={styles.chatItemContent}>
                    <View style={styles.chatAvatarContainer}>
                      <Image 
                        source={{ uri: professional.profile_image || 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                        style={styles.chatAvatar} 
                      />
                      {professional.is_available && (
                        <View style={styles.onlineIndicator} />
                      )}
                    </View>
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName}>{professional.full_name}</Text>
                      <Text style={styles.chatSpecialty}>{professional.specialty}</Text>
                      <View style={styles.chatRating}>
                        <FontAwesome name="star" size={12} color="#f39c12" />
                        <Text style={styles.chatRatingText}>{professionalsService.formatRating(professional.rating || 0)}</Text>
                        <Text style={styles.chatExperience}> • {professional.experience_text || `${professional.experience_years || 0} years experience`}</Text>
                      </View>
                      {!professional.is_available && (
                        <Text style={styles.chatUnavailable}>Currently unavailable</Text>
                      )}
                    </View>
                    <View style={styles.chatAction}>
                      <FontAwesome 
                        name={professional.is_available ? "comment" : "clock-o"} 
                        size={16} 
                        color={professional.is_available ? "#3498db" : "#95a5a6"} 
                      />
                    </View>
                  </View>
          </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 8,
    fontWeight: '500',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  reloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  reloadButtonDisabled: {
    opacity: 0.5,
  },
  nearbyList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  nearbyImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  nearbyImage: {
    width: '100%',
    height: '100%',
  },
  nearbyInfo: {
    flex: 1,
  },
  nearbyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  nearbyType: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  nearbyRight: {
    alignItems: 'flex-end',
  },
  nearbyDistance: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    marginBottom: 4,
  },
  mapPreview: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#3498db',
    marginLeft: 8,
  },
  orderList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  orderPrice: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  orderButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chatItemUnavailable: {
    opacity: 0.6,
  },
  chatAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ecc71',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatAction: {
    marginLeft: 12,
    paddingHorizontal: 8,
  },
  chatName: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 2,
  },
  chatSpecialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  chatRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatRatingText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
    marginLeft: 4,
  },
  chatExperience: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  chatUnavailable: {
    fontSize: 11,
    color: '#e74c3c',
    fontStyle: 'italic',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});
