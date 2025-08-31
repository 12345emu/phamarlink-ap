import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, Linking, Dimensions } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';
const BACKGROUND = '#f8f9fa';

export default function PharmacyMapModal() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  const pharmacy = {
    name: params.pharmacyName as string || 'CityMed Pharmacy',
    address: params.pharmacyAddress as string || '456 Oak St, Accra',
    phone: params.pharmacyPhone as string || '+233-555-0456',
    rating: parseFloat(params.pharmacyRating as string) || 4.3,
    distance: params.pharmacyDistance as string || '1.2 km',
    latitude: parseFloat(params.latitude as string) || 5.5600,
    longitude: parseFloat(params.longitude as string) || -0.2057,
  };

  // Debug: Log received coordinates
  console.log('🔍 Map modal received coordinates:', {
    latitude: params.latitude,
    longitude: params.longitude,
    parsedLatitude: pharmacy.latitude,
    parsedLongitude: pharmacy.longitude
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your location on the map.');
        return;
      }
      
      setLocationPermission(true);
      
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  const getMapRegion = () => {
    if (userLocation) {
      return {
        latitude: (userLocation.coords.latitude + pharmacy.latitude) / 2,
        longitude: (userLocation.coords.longitude + pharmacy.longitude) / 2,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };

  const handleGetDirections = () => {
    const pharmacyName = pharmacy.name;
    const latitude = pharmacy.latitude;
    const longitude = pharmacy.longitude;
    
    Alert.alert(
      'Get Directions',
      `Would you like to open directions to ${pharmacyName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Directions',
          onPress: async () => {
            try {
              // Use coordinates for more accurate navigation
              const coordinates = `${latitude},${longitude}`;
              
              // First try to open Google Maps app with coordinates
              const googleMapsUrl = `comgooglemaps://?daddr=${coordinates}&directionsmode=driving`;
              const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
              
              if (canOpenGoogleMaps) {
                // Google Maps app is installed, open it with coordinates
                await Linking.openURL(googleMapsUrl);
              } else {
                // Google Maps app not installed, open in browser with coordinates
                const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${coordinates}`;
                await Linking.openURL(webUrl);
              }
            } catch (err) {
              Alert.alert(
                'Error',
                'Could not open directions. Please try again or use your preferred map app.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleCallPharmacy = () => {
    const phoneNumber = pharmacy.phone;
    if (phoneNumber) {
      Alert.alert(
        'Call Pharmacy',
        `Would you like to call ${pharmacy.name} at ${phoneNumber}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Call',
            onPress: () => {
              Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
                Alert.alert('Error', 'Could not make the call. Please try again.');
              });
            },
          },
        ]
      );
    } else {
      Alert.alert('Phone Number Unavailable', 'Phone number is not available for this pharmacy.');
    }
  };

  const calculateDistance = () => {
    if (!userLocation) return pharmacy.distance;
    
    const R = 6371; // Earth's radius in kilometers
    const lat1 = userLocation.coords.latitude * Math.PI / 180;
    const lat2 = pharmacy.latitude * Math.PI / 180;
    const deltaLat = (pharmacy.latitude - userLocation.coords.latitude) * Math.PI / 180;
    const deltaLon = (pharmacy.longitude - userLocation.coords.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[ACCENT, '#2980b9']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{pharmacy.name}</Text>
          <Text style={styles.headerSubtitle}>Location & Directions</Text>
        </View>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={getMapRegion()}
          showsUserLocation={locationPermission}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
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
              pinColor={SUCCESS}
            />
          )}
          
          {/* Pharmacy Marker */}
          <Marker
            coordinate={{
              latitude: pharmacy.latitude,
              longitude: pharmacy.longitude,
            }}
            title={pharmacy.name}
            description={`${pharmacy.address} • ${calculateDistance()}`}
            pinColor={ACCENT}
          />
        </MapView>
      </View>

      {/* Pharmacy Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.pharmacyInfo}>
          <View style={styles.pharmacyHeader}>
            <View style={styles.pharmacyIcon}>
              <FontAwesome name="medkit" size={24} color={ACCENT} />
            </View>
            <View style={styles.pharmacyDetails}>
              <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
              <Text style={styles.pharmacyAddress}>{pharmacy.address}</Text>
              <View style={styles.ratingContainer}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.ratingText}>{pharmacy.rating}</Text>
                <Text style={styles.distanceText}>• {calculateDistance()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={handleGetDirections}
            activeOpacity={0.8}
          >
            <FontAwesome name="map-marker" size={18} color="white" />
            <Text style={styles.actionButtonText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={handleCallPharmacy}
            activeOpacity={0.8}
          >
            <FontAwesome name="phone" size={18} color="white" />
            <Text style={styles.actionButtonText}>Call Pharmacy</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  pharmacyInfo: {
    marginBottom: 20,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pharmacyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pharmacyDetails: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  pharmacyAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  directionsButton: {
    backgroundColor: ACCENT,
  },
  callButton: {
    backgroundColor: SUCCESS,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
}); 