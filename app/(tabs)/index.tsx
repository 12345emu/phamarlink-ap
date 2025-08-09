import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput, Animated, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

type FontAwesomeIconName = keyof typeof FontAwesome.glyphMap;

const { width } = Dimensions.get('window');

const nearbyOptions = [
  {
    name: 'Holy Family Hospital',
    type: 'Hospital',
    distance: '2,1 km',
    icon: 'hospital-o',
    iconColor: '#e74c3c',
  },
  {
    name: 'CityMed Pharmacy',
    type: 'Pharmacy',
    distance: '1,2 km',
    icon: 'medkit',
    iconColor: '#3498db',
  },
  {
    name: 'East Legon Clinic',
    type: 'Clinic',
    distance: '3,4 km',
    icon: 'map-marker',
    iconColor: '#3498db',
  },
];

const orderOptions = [
  {
    name: 'Paracetamol',
    price: 'GHS 10',
    icon: 'medkit',
    action: 'Add to cart',
  },
  {
    name: 'Book Doctor Visit',
    price: '',
    icon: 'calendar',
    action: 'Book',
  },
];

const chatProfessionals = [
  {
    name: 'Dr. Kwame',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: 'Pharmacist Am',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
];

export default function HomeScreen(props: any) {
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const router = useRouter();

  // Filter nearby options based on search query
  const filteredNearbyOptions = nearbyOptions.filter(option =>
    option.name.toLowerCase().includes(search.toLowerCase()) ||
    option.type.toLowerCase().includes(search.toLowerCase())
  );

  // Filter order options based on search query
  const filteredOrderOptions = orderOptions.filter(option =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort order options to prioritize medicine-related items when searching for "medicine"
  const sortedOrderOptions = [...filteredOrderOptions].sort((a, b) => {
    const searchLower = search.toLowerCase();
    if (searchLower.includes('medicine') || searchLower.includes('med')) {
      // If searching for medicine, prioritize medicine items
      const aIsMedicine = a.name.toLowerCase().includes('medicine') || a.name.toLowerCase().includes('med');
      const bIsMedicine = b.name.toLowerCase().includes('medicine') || b.name.toLowerCase().includes('med');
      
      if (aIsMedicine && !bIsMedicine) return -1; // a comes first
      if (!aIsMedicine && bIsMedicine) return 1;  // b comes first
    }
    return 0; // Keep original order if no medicine priority
  });

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
    })();
  }, []);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.sectionTitle}>Nearby options</Text>
          <View style={styles.nearbyList}>
            {filteredNearbyOptions.length === 0 && search.length > 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="search" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No nearby places found</Text>
              </View>
            ) : (
              filteredNearbyOptions.map((option, index) => (
              <TouchableOpacity 
                key={option.name} 
                style={styles.nearbyItem}
                onPress={() => {
                  if (option.type === 'Hospital') {
                    router.push({
                      pathname: '/hospital-details-modal',
                      params: {
                        hospitalName: option.name,
                        hospitalDistance: option.distance,
                        hospitalOpen: 'true'
                      }
                    });
                  } else {
                    router.push({
                      pathname: '/pharmacy-details-modal',
                      params: {
                        pharmacyName: option.name,
                        pharmacyDistance: option.distance,
                        pharmacyOpen: 'true'
                      }
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.nearbyIcon, { backgroundColor: option.iconColor + '20' }]}>
                  <FontAwesome name={option.icon as FontAwesomeIconName} size={16} color={option.iconColor} />
                </View>
                <View style={styles.nearbyInfo}>
                  <Text style={styles.nearbyName}>{option.name}</Text>
                  <Text style={styles.nearbyType}>{option.type}</Text>
                </View>
                <View style={styles.nearbyRight}>
                  <Text style={styles.nearbyDistance}>{option.distance}</Text>
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
            
            {/* Hospital Marker */}
            <Marker
              coordinate={{
                latitude: 5.5600,
                longitude: -0.2057,
              }}
              title="Holy Family Hospital"
              description="Hospital • 2.1 km"
              pinColor="#e74c3c"
            />
            {/* Pharmacy Marker */}
            <Marker
              coordinate={{
                latitude: 5.5650,
                longitude: -0.2100,
              }}
              title="CityMed Pharmacy"
              description="Pharmacy • 1.2 km"
              pinColor="#3498db"
            />
            {/* Clinic Marker */}
            <Marker
              coordinate={{
                latitude: 5.5550,
                longitude: -0.2000,
              }}
              title="East Legon Clinic"
              description="Clinic • 3.4 km"
              pinColor="#3498db"
            />
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

        {/* Order Medicine or Book Appointment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Medicine or Book Appointment</Text>
          <View style={styles.orderList}>
            {sortedOrderOptions.length === 0 && search.length > 0 ? (
              <View style={styles.noResults}>
                <FontAwesome name="search" size={24} color="#95a5a6" />
                <Text style={styles.noResultsText}>No order options found</Text>
              </View>
            ) : (
              sortedOrderOptions.map((option, index) => (
              <View key={option.name} style={styles.orderItem}>
                <View style={styles.orderLeft}>
                  <View style={styles.orderIcon}>
                    <FontAwesome name={option.icon as FontAwesomeIconName} size={18} color="#7f8c8d" />
                    </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderName}>{option.name}</Text>
                    {option.price && <Text style={styles.orderPrice}>{option.price}</Text>}
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.orderButton} 
                  activeOpacity={0.7}
                  onPress={() => {
                    if (option.action === 'Add to cart') {
                      // Navigate to pharmacy details page for medicine
                      router.push({
                        pathname: '/pharmacy-details-modal',
                        params: {
                          pharmacyName: 'CityMed Pharmacy',
                          pharmacyDistance: '1.2 km',
                          pharmacyOpen: 'true'
                        }
                      });
                    } else if (option.action === 'Book') {
                      // Navigate to hospital details page for appointments
                      router.push({
                        pathname: '/hospital-details-modal',
                        params: {
                          hospitalName: 'Holy Family Hospital',
                          hospitalDistance: '2.1 km',
                          hospitalOpen: 'true'
                        }
                      });
                    }
                  }}
                >
                  <Text style={styles.orderButtonText}>{option.action}</Text>
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
            {chatProfessionals.map((professional, index) => (
              <TouchableOpacity 
                key={professional.name} 
                style={styles.chatItem}
                onPress={() => router.push('/(tabs)/chat')}
                activeOpacity={0.7}
              >
                <Image source={{ uri: professional.avatar }} style={styles.chatAvatar} />
                <Text style={styles.chatName}>{professional.name}</Text>
          </TouchableOpacity>
            ))}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
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
  nearbyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatItem: {
    alignItems: 'center',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  chatName: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
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
});
