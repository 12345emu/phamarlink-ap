import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';

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
}

export default function PharmaciesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([
    {
      id: 1,
      name: "CVS Pharmacy",
      address: "123 Main St, Downtown",
      distance: "0.3 km",
      rating: 4.5,
      isOpen: true,
      phone: "+1-555-0123",
      coordinates: { latitude: 40.7128, longitude: -74.0060 }
    },
    {
      id: 2,
      name: "Walgreens",
      address: "456 Oak Ave, Midtown",
      distance: "0.8 km",
      rating: 4.2,
      isOpen: true,
      phone: "+1-555-0124",
      coordinates: { latitude: 40.7589, longitude: -73.9851 }
    },
    {
      id: 3,
      name: "Rite Aid",
      address: "789 Pine St, Uptown",
      distance: "1.2 km",
      rating: 4.0,
      isOpen: false,
      phone: "+1-555-0125",
      coordinates: { latitude: 40.7505, longitude: -73.9934 }
    },
    {
      id: 4,
      name: "Local Pharmacy",
      address: "321 Elm St, Downtown",
      distance: "0.5 km",
      rating: 4.7,
      isOpen: true,
      phone: "+1-555-0126",
      coordinates: { latitude: 40.7142, longitude: -74.0064 }
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
    // In a real app, you would use Linking.openURL(url)
    Alert.alert('Open in Maps', `Would open directions to ${pharmacy.name} in Google Maps`);
  };

  const callPharmacy = (phone: string) => {
    // In a real app, you would use Linking.openURL(`tel:${phone}`)
    Alert.alert('Call Pharmacy', `Would call ${phone}`);
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
          size={12}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Pharmacies</Text>
        <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
          <FontAwesome name="location-arrow" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pharmacies..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.pharmacyList}>
        {filteredPharmacies.map((pharmacy) => (
          <View key={pharmacy.id} style={styles.pharmacyCard}>
            <View style={styles.pharmacyHeader}>
              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                <View style={styles.ratingContainer}>
                  {renderStars(pharmacy.rating)}
                  <Text style={styles.ratingText}>({pharmacy.rating})</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: pharmacy.isOpen ? '#4CAF50' : '#f44336' }]}>
                <Text style={styles.statusText}>{pharmacy.isOpen ? 'Open' : 'Closed'}</Text>
              </View>
            </View>

            <Text style={styles.pharmacyAddress}>{pharmacy.address}</Text>
            <Text style={styles.pharmacyDistance}>{pharmacy.distance} away</Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openInMaps(pharmacy)}
              >
                <FontAwesome name="map-marker" size={16} color="#2196F3" />
                <Text style={styles.actionButtonText}>Directions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => callPharmacy(pharmacy.phone)}
              >
                <FontAwesome name="phone" size={16} color="#4CAF50" />
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.orderButton}>
                <FontAwesome name="shopping-cart" size={16} color="white" />
                <Text style={styles.orderButtonText}>Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  locationButton: {
    padding: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  pharmacyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pharmacyCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  pharmacyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pharmacyDistance: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#333',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  orderButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
}); 