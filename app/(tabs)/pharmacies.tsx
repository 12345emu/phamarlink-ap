import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const ACCENT = '#8B5CF6';
const GLASS_BG = 'rgba(255,255,255,0.7)';

interface Pharmacy {
  id: number;
  name: string;
  address: string;
  distance: string;
  rating: number;
  isOpen: boolean;
  phone: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image?: string;
}

export default function PharmaciesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([
    {
      id: 1,
      name: "CVS Pharmacy",
      address: "123 Main St, Downtown",
      distance: "0.3 km",
      rating: 4.5,
      isOpen: true,
      phone: "+1-555-0123",
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      name: "Walgreens",
      address: "456 Oak Ave, Midtown",
      distance: "0.8 km",
      rating: 4.2,
      isOpen: true,
      phone: "+1-555-0124",
      coordinates: { latitude: 40.7589, longitude: -73.9851 },
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      name: "Rite Aid",
      address: "789 Pine St, Uptown",
      distance: "1.2 km",
      rating: 4.0,
      isOpen: false,
      phone: "+1-555-0125",
      coordinates: { latitude: 40.7505, longitude: -73.9934 },
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 4,
      name: "Local Pharmacy",
      address: "321 Elm St, Downtown",
      distance: "0.5 km",
      rating: 4.7,
      isOpen: true,
      phone: "+1-555-0126",
      coordinates: { latitude: 40.7142, longitude: -74.0064 },
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80"
    }
  ]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to find nearby pharmacies.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const openInMaps = (pharmacy: Pharmacy) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.coordinates.latitude},${pharmacy.coordinates.longitude}`;
    Alert.alert('Open in Maps', `Would open directions to ${pharmacy.name} in Google Maps`);
  };

  const callPharmacy = (phone: string) => {
    Alert.alert('Call Pharmacy', `Would call ${phone}`);
  };

  const navigateToPharmacyDetails = (pharmacy: Pharmacy) => {
    router.push({
      pathname: '/pharmacy-details-modal',
      params: {
        id: pharmacy.id.toString(),
        name: pharmacy.name,
        address: pharmacy.address,
        distance: pharmacy.distance,
        rating: pharmacy.rating.toString(),
        isOpen: pharmacy.isOpen.toString(),
        phone: pharmacy.phone,
        image: pharmacy.image || '',
        latitude: pharmacy.coordinates.latitude.toString(),
        longitude: pharmacy.coordinates.longitude.toString(),
      }
    });
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? 'star' : 'star-o'}
          size={14}
          color={i <= rating ? '#FFD700' : '#ddd'}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#f7fafd', '#f3f4f6']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Pharmacies</Text>
              <Text style={styles.subtitle}>Find nearby locations</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation} activeOpacity={0.8}>
                <View style={styles.locationButtonGlass}>
                  <FontAwesome name="location-arrow" size={20} color={ACCENT} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileButton} activeOpacity={0.8}>
                <Image 
                  source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                  style={styles.profileImage} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color={ACCENT} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pharmacies..."
            placeholderTextColor="#aaa"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Pharmacies List */}
      <ScrollView style={styles.pharmacyList} showsVerticalScrollIndicator={false}>
        {filteredPharmacies.map((pharmacy) => (
          <TouchableOpacity 
            key={pharmacy.id} 
            style={styles.pharmacyCard}
            onPress={() => navigateToPharmacyDetails(pharmacy)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
              style={styles.pharmacyCardGradient}
            >
              <View style={styles.pharmacyHeader}>
                <View style={styles.pharmacyImageContainer}>
                  <Image 
                    source={{ uri: pharmacy.image }} 
                    style={styles.pharmacyImage}
                    defaultSource={{ uri: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80" }}
                  />
                  <View style={[styles.statusBadge, { backgroundColor: pharmacy.isOpen ? '#10B981' : '#EF4444' }]}>
                    <Text style={styles.statusText}>{pharmacy.isOpen ? 'Open' : 'Closed'}</Text>
                  </View>
                </View>
                <View style={styles.pharmacyInfo}>
                  <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                  <View style={styles.ratingContainer}>
                    {renderStars(pharmacy.rating)}
                    <Text style={styles.ratingText}>{pharmacy.rating}</Text>
                  </View>
                  <Text style={styles.pharmacyAddress}>{pharmacy.address}</Text>
                  <Text style={styles.pharmacyDistance}>{pharmacy.distance} away</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    openInMaps(pharmacy);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionButtonGlass}>
                    <FontAwesome name="map-marker" size={16} color={ACCENT} />
                    <Text style={styles.actionButtonText}>Directions</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    callPharmacy(pharmacy.phone);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionButtonGlass}>
                    <FontAwesome name="phone" size={16} color={ACCENT} />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.orderButton} 
                  activeOpacity={0.85}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigateToPharmacyDetails(pharmacy);
                  }}
                >
                  <LinearGradient
                    colors={[ACCENT, '#A855F7']}
                    style={styles.orderButtonGradient}
                  >
                    <FontAwesome name="shopping-cart" size={16} color="white" />
                    <Text style={styles.orderButtonText}>Order</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonGlass: {
    backgroundColor: GLASS_BG,
    borderRadius: 22,
    padding: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  pharmacyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pharmacyCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pharmacyCardGradient: {
    padding: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pharmacyImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  pharmacyImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  statusBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  pharmacyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pharmacyDistance: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  actionButtonGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
  },
  orderButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  orderButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: 'white',
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 22,
  },
}); 