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

export default function HospitalMapModal() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  const hospital = {
    name: params.hospitalName as string || 'Holy Family Hospital',
    address: params.hospitalAddress as string || '123 Main St, Accra',
    phone: params.hospitalPhone as string || '+233-555-0123',
    rating: parseFloat(params.hospitalRating as string) || 4.5,
    distance: params.hospitalDistance as string || '2.1 km',
    latitude: parseFloat(params.latitude as string) || 5.6037,
    longitude: parseFloat(params.longitude as string) || -0.1870,
  };

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
        latitude: (userLocation.coords.latitude + hospital.latitude) / 2,
        longitude: (userLocation.coords.longitude + hospital.longitude) / 2,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };

  const handleGetDirections = () => {
    const hospitalAddress = hospital.address;
    const hospitalName = hospital.name;
    
    Alert.alert(
      'Get Directions',
      `Would you like to open directions to ${hospitalName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Directions',
          onPress: async () => {
            try {
              // First try to open Google Maps app
              const googleMapsUrl = `comgooglemaps://?daddr=${encodeURIComponent(hospitalAddress)}&directionsmode=driving`;
              const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
              
              if (canOpenGoogleMaps) {
                // Google Maps app is installed, open it
                await Linking.openURL(googleMapsUrl);
              } else {
                // Google Maps app not installed, open in browser
                const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospitalAddress)}`;
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

  const handleCallHospital = () => {
    const phoneNumber = hospital.phone;
    if (phoneNumber) {
      Alert.alert(
        'Call Hospital',
        `Would you like to call ${hospital.name} at ${phoneNumber}?`,
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
      Alert.alert('Phone Number Unavailable', 'Phone number is not available for this hospital.');
    }
  };

  const calculateDistance = () => {
    if (!userLocation) return hospital.distance;
    
    const R = 6371; // Earth's radius in kilometers
    const lat1 = userLocation.coords.latitude * Math.PI / 180;
    const lat2 = hospital.latitude * Math.PI / 180;
    const deltaLat = (hospital.latitude - userLocation.coords.latitude) * Math.PI / 180;
    const deltaLon = (hospital.longitude - userLocation.coords.longitude) * Math.PI / 180;

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
        colors={[DANGER, '#c0392b']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{hospital.name}</Text>
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
          
          {/* Hospital Marker */}
          <Marker
            coordinate={{
              latitude: hospital.latitude,
              longitude: hospital.longitude,
            }}
            title={hospital.name}
            description={`${hospital.address} • ${calculateDistance()}`}
            pinColor={DANGER}
          />
        </MapView>
      </View>

      {/* Hospital Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.hospitalInfo}>
          <View style={styles.hospitalHeader}>
            <View style={styles.hospitalIcon}>
              <FontAwesome name="hospital-o" size={24} color={DANGER} />
            </View>
            <View style={styles.hospitalDetails}>
              <Text style={styles.hospitalName}>{hospital.name}</Text>
              <Text style={styles.hospitalAddress}>{hospital.address}</Text>
              <View style={styles.ratingContainer}>
                <FontAwesome name="star" size={14} color="#f39c12" />
                <Text style={styles.ratingText}>{hospital.rating}</Text>
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
            onPress={handleCallHospital}
            activeOpacity={0.8}
          >
            <FontAwesome name="phone" size={18} color="white" />
            <Text style={styles.actionButtonText}>Call Hospital</Text>
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
  hospitalInfo: {
    marginBottom: 20,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hospitalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hospitalDetails: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  hospitalAddress: {
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