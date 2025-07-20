import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image, Modal } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
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
  openingHours: string;
  services: string[];
  isFavorite: boolean;
  deliveryAvailable: boolean;
  insuranceAccepted: boolean;
  emergencyService: boolean;
}

export default function PharmaciesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'hospitals'>('pharmacies');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterInsurance, setFilterInsurance] = useState(false);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const router = useRouter();
  
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([
    {
      id: 1,
      name: "Alpha Pharmacy",
      address: "123 Main St, Downtown",
      distance: "0,6 km",
      rating: 4.5,
      isOpen: true,
      phone: "+233-555-0123",
      coordinates: { latitude: 5.5600, longitude: -0.2057 },
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80",
      openingHours: "8:00 AM - 10:00 PM",
      services: ["Prescription", "Delivery", "Consultation"],
      isFavorite: false,
      deliveryAvailable: true,
      insuranceAccepted: true,
      emergencyService: true,
    },
    {
      id: 2,
      name: "MediCare Pharmacy",
      address: "456 Oak Ave, Midtown",
      distance: "1,1 km",
      rating: 4.2,
      isOpen: true,
      phone: "+233-555-0124",
      coordinates: { latitude: 5.5650, longitude: -0.2100 },
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80",
      openingHours: "7:00 AM - 11:00 PM",
      services: ["Prescription", "Vaccination", "Health Check"],
      isFavorite: true,
      deliveryAvailable: true,
      insuranceAccepted: true,
      emergencyService: false,
    },
    {
      id: 3,
      name: "Green Cross Pharmacy",
      address: "789 Pine St, Uptown",
      distance: "1,5 km",
      rating: 4.0,
      isOpen: false,
      phone: "+233-555-0125",
      coordinates: { latitude: 5.5550, longitude: -0.2000 },
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      openingHours: "9:00 AM - 9:00 PM",
      services: ["Prescription", "Delivery"],
      isFavorite: false,
      deliveryAvailable: true,
      insuranceAccepted: false,
      emergencyService: false,
    },
    {
      id: 4,
      name: "WellCare Pharmacy",
      address: "321 Elm St, Downtown",
      distance: "2,0 km",
      rating: 4.7,
      isOpen: true,
      phone: "+233-555-0126",
      coordinates: { latitude: 5.5700, longitude: -0.2150 },
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
      openingHours: "24/7",
      services: ["Prescription", "Delivery", "Emergency", "Consultation"],
      isFavorite: false,
      deliveryAvailable: true,
      insuranceAccepted: true,
      emergencyService: true,
    }
  ]);

  const [hospitals, setHospitals] = useState<Pharmacy[]>([
    {
      id: 1,
      name: "Holy Family Hospital",
      address: "123 Hospital Ave, Downtown",
      distance: "0,8 km",
      rating: 4.5,
      isOpen: true,
      phone: "+233-555-0127",
      coordinates: { latitude: 5.5600, longitude: -0.2057 },
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80",
      openingHours: "24/7",
      services: ["Emergency", "Surgery", "Consultation"],
      isFavorite: false,
      deliveryAvailable: false,
      insuranceAccepted: true,
      emergencyService: true,
    },
    {
      id: 2,
      name: "City General Hospital",
      address: "456 Medical St, Midtown",
      distance: "1,3 km",
      rating: 4.2,
      isOpen: true,
      phone: "+233-555-0128",
      coordinates: { latitude: 5.5650, longitude: -0.2100 },
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80",
      openingHours: "6:00 AM - 10:00 PM",
      services: ["Emergency", "Consultation", "Laboratory"],
      isFavorite: true,
      deliveryAvailable: false,
      insuranceAccepted: true,
      emergencyService: true,
    },
    {
      id: 3,
      name: "East Legon Clinic",
      address: "789 Health Blvd, Uptown",
      distance: "1,8 km",
      rating: 4.0,
      isOpen: true,
      phone: "+233-555-0129",
      coordinates: { latitude: 5.5550, longitude: -0.2000 },
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      openingHours: "8:00 AM - 8:00 PM",
      services: ["Consultation", "Laboratory", "Vaccination"],
      isFavorite: false,
      deliveryAvailable: false,
      insuranceAccepted: false,
      emergencyService: false,
    }
  ]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

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

  const navigateToDetails = (item: Pharmacy) => {
    if (activeTab === 'pharmacies') {
      router.push({
        pathname: '/pharmacy-details-modal',
        params: {
          id: item.id.toString(),
          pharmacyName: item.name,
          pharmacyAddress: item.address,
          pharmacyDistance: item.distance,
          pharmacyRating: item.rating.toString(),
          pharmacyOpen: item.isOpen.toString(),
          phone: item.phone,
          pharmacyImage: item.image || '',
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
          hospitalAddress: item.address,
          hospitalDistance: item.distance,
          hospitalRating: item.rating.toString(),
          hospitalOpen: item.isOpen.toString(),
          phone: item.phone,
          hospitalImage: item.image || '',
          latitude: item.coordinates.latitude.toString(),
          longitude: item.coordinates.longitude.toString(),
        }
      });
    }
  };

  const toggleFavorite = (itemId: number) => {
    if (activeTab === 'pharmacies') {
      setPharmacies(prev => prev.map(item => 
        item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
      ));
    } else {
      setHospitals(prev => prev.map(item => 
        item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
      ));
    }
  };

  const callPlace = (phone: string) => {
    Alert.alert('Call', `Would call ${phone}`);
  };

  const getDirections = (item: Pharmacy) => {
    Alert.alert('Directions', `Would open directions to ${item.name}`);
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
    let items = (activeTab === 'pharmacies' ? pharmacies : hospitals).filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filters
    if (filterOpen) {
      items = items.filter(item => item.isOpen);
    }
    if (filterDelivery) {
      items = items.filter(item => item.deliveryAvailable);
    }
    if (filterInsurance) {
      items = items.filter(item => item.insuranceAccepted);
    }
    if (filterEmergency) {
      items = items.filter(item => item.emergencyService);
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return parseFloat(a.distance.replace(',', '.')) - parseFloat(b.distance.replace(',', '.'));
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
      <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.itemCard}
            onPress={() => navigateToDetails(item)}
            activeOpacity={0.7}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemIcon}>
                <FontAwesome 
                  name={activeTab === 'pharmacies' ? 'medkit' : 'hospital-o'} 
                  size={20} 
                  color={ACCENT} 
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
                <Text style={styles.itemAddress}>{item.address}</Text>
                <Text style={styles.itemHours}>{item.openingHours}</Text>
              </View>
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(item.id)}
                activeOpacity={0.7}
              >
                <FontAwesome 
                  name={item.isFavorite ? 'heart' : 'heart-o'} 
                  size={18} 
                  color={item.isFavorite ? '#e74c3c' : '#95a5a6'} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.itemFooter}>
              <View style={styles.itemDistance}>
                <FontAwesome name="map-marker" size={14} color="#95a5a6" />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
              
              <View style={styles.itemServices}>
                {item.deliveryAvailable && (
                  <View style={styles.serviceBadge}>
                    <FontAwesome name="truck" size={10} color="#fff" />
                    <Text style={styles.serviceText}>Delivery</Text>
                  </View>
                )}
                {item.emergencyService && (
                  <View style={[styles.serviceBadge, { backgroundColor: '#e74c3c' }]}>
                    <FontAwesome name="exclamation-triangle" size={10} color="#fff" />
                    <Text style={styles.serviceText}>24/7</Text>
                  </View>
                )}
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => callPlace(item.phone)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
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
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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