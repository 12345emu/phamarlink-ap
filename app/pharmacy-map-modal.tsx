import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image, Linking, Platform, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const ACCENT = '#8B5CF6';
const GLASS_BG = 'rgba(255,255,255,0.7)';

const mockNearby = [
  {
    id: 2,
    name: 'Walgreens',
    address: '456 Oak Ave, Midtown',
    latitude: 40.7589,
    longitude: -73.9851,
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80',
    distance: '0.8 km',
    isOpen: true,
    phone: '+1-555-0124',
  },
  {
    id: 3,
    name: 'Rite Aid',
    address: '789 Pine St, Uptown',
    latitude: 40.7505,
    longitude: -73.9934,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    distance: '1.2 km',
    isOpen: false,
    phone: '+1-555-0125',
  },
];

export default function PharmacyMapModal() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [search, setSearch] = useState('');
  const selectedPharmacy = {
    id: params.id,
    name: params.name,
    address: params.address,
    latitude: parseFloat(params.latitude as string),
    longitude: parseFloat(params.longitude as string),
    image: params.image,
    isOpen: params.isOpen === 'true',
    phone: params.phone as string || '',
  };
  const allPharmacies = [selectedPharmacy, ...mockNearby];

  // Debug: log coordinates
  console.log('Selected pharmacy:', selectedPharmacy);
  allPharmacies.forEach((ph, i) => {
    console.log(`Pharmacy ${i}:`, ph.name, Number(ph.latitude), Number(ph.longitude));
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your position on the map.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const openDirections = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url!);
  };

  const openCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // Filter pharmacies by search
  const filteredPharmacies = allPharmacies.filter(pharmacy =>
    String(pharmacy.name).toLowerCase().includes(search.toLowerCase()) ||
    String(pharmacy.address).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Floating Search Bar */}
      <View style={styles.searchBarContainer}>
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.searchBarContent}>
          <FontAwesome name="search" size={18} color={ACCENT} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pharmacies..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <FontAwesome name="sliders" size={18} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Section */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: Number(selectedPharmacy.latitude),
          longitude: Number(selectedPharmacy.longitude),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={!!userLocation}
      >
        {userLocation && (
          <Marker
            coordinate={{
              latitude: Number(userLocation.latitude),
              longitude: Number(userLocation.longitude),
            }}
            title="You"
            pinColor="#6366F1"
          />
        )}
        {filteredPharmacies.map((pharmacy, idx) => {
          let imageUri = '';
          if (typeof pharmacy.image === 'string') imageUri = pharmacy.image;
          else if (Array.isArray(pharmacy.image) && typeof pharmacy.image[0] === 'string') imageUri = pharmacy.image[0];
          return (
            <Marker
              key={String(pharmacy.id)}
              coordinate={{
                latitude: Number(pharmacy.latitude),
                longitude: Number(pharmacy.longitude),
              }}
              title={String(pharmacy.name)}
              description={String(pharmacy.address)}
            >
              <View style={styles.selectedMarker}>
                <Image source={{ uri: imageUri }} style={styles.markerImage} />
                <FontAwesome name="map-marker" size={36} color={ACCENT} style={{ position: 'absolute', bottom: -18, left: 0, right: 0 }} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Card Carousel Over Map */}
      <View style={styles.carouselContainer} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {filteredPharmacies.map((pharmacy, idx) => {
            let imageUri = '';
            if (typeof pharmacy.image === 'string') imageUri = pharmacy.image;
            else if (Array.isArray(pharmacy.image) && typeof pharmacy.image[0] === 'string') imageUri = pharmacy.image[0];
            const isOpen = pharmacy.isOpen;
            return (
              <View key={String(pharmacy.id)} style={styles.carouselCard}>
                <Image source={{ uri: imageUri }} style={styles.carouselImage} />
                <View style={styles.carouselInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.carouselName}>{pharmacy.name}</Text>
                    {isOpen !== undefined && (
                      <View style={[styles.carouselStatus, { backgroundColor: isOpen ? '#10B981' : '#EF4444' }]} />
                    )}
                  </View>
                  <Text style={styles.carouselAddress}>{pharmacy.address}</Text>
                  <View style={styles.carouselActions}>
                    <TouchableOpacity style={styles.carouselActionBtn} onPress={() => openDirections(pharmacy.latitude, pharmacy.longitude)}>
                      <FontAwesome name="map-signs" size={15} color={ACCENT} />
                      <Text style={styles.carouselActionText}>Directions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.carouselActionBtn} onPress={() => openCall(pharmacy.phone)}>
                      <FontAwesome name="phone" size={15} color={ACCENT} />
                      <Text style={styles.carouselActionText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Floating Directions Button */}
      <TouchableOpacity
        style={styles.fabDirections}
        onPress={() => openDirections(Number(selectedPharmacy.latitude), Number(selectedPharmacy.longitude))}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[ACCENT, '#A855F7']} style={styles.fabDirectionsGradient}>
          <FontAwesome name="location-arrow" size={22} color="#fff" />
          <Text style={styles.fabDirectionsText}>Directions</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchBarContainer: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  searchBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: width - 36,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  filterBtn: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  map: {
    flex: 1,
    borderRadius: 0,
  },
  selectedMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: -10,
    zIndex: 2,
  },
  carouselContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    zIndex: 10,
  },
  carouselCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 22,
    padding: 12,
    marginRight: 16,
    width: 220,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'flex-start',
  },
  carouselImage: {
    width: '100%',
    height: 90,
    borderRadius: 16,
    marginBottom: 8,
  },
  carouselInfo: {
    width: '100%',
  },
  carouselName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 8,
  },
  carouselStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 2,
  },
  carouselAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  carouselActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  carouselActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  carouselActionText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  fabDirections: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    zIndex: 30,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  fabDirectionsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 28,
  },
  fabDirectionsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
}); 