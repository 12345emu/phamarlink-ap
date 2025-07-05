import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput, Animated } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

type FontAwesomeIconName = keyof typeof FontAwesome.glyphMap;

const { width } = Dimensions.get('window');

const user = {
  name: 'John Doe',
  avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
};

const quickActions = [
  { title: 'Find Pharmacies', icon: 'map-marker', color: '#eafaf1', route: 'pharmacies' },
  { title: 'Order Medicine', icon: 'shopping-cart', color: '#f9f6f2', route: 'orders' },
  { title: 'Track Delivery', icon: 'truck', color: '#f0f4f8', route: 'orders' },
  { title: 'Chat', icon: 'comments', color: '#f5f6fa', route: 'chat' },
];

const featuredPharmacies = [
  {
    name: 'CVS Pharmacy',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    rating: 4.8,
    distance: '0.3 km',
    open: true,
  },
  {
    name: 'Walgreens',
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80',
    rating: 4.6,
    distance: '0.8 km',
    open: true,
  },
  {
    name: 'Rite Aid',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
    rating: 4.2,
    distance: '1.2 km',
    open: false,
  },
];

const featuredHospitals = [
  {
    name: 'General Hospital',
    image: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=400&q=80',
    rating: 4.7,
    distance: '0.5 km',
    open: true,
  },
  {
    name: 'City Medical Center',
    image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    rating: 4.5,
    distance: '1.1 km',
    open: true,
  },
  {
    name: 'St. Mary Hospital',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80',
    rating: 4.3,
    distance: '2.0 km',
    open: false,
  },
];

const nearbyPharmacies = [
  {
    name: 'Pharmaprix',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80',
    rating: 4.4,
    distance: '0.2 km',
    open: true,
    address: '123 Main St, Montreal',
  },
  {
    name: 'Jean Coutu',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&q=80',
    rating: 4.6,
    distance: '0.4 km',
    open: true,
    address: '456 Oak Ave, Montreal',
  },
  {
    name: 'Uniprix',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=400&q=80',
    rating: 4.2,
    distance: '0.7 km',
    open: false,
    address: '789 Pine Rd, Montreal',
  },
  {
    name: 'Shoppers Drug Mart',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    rating: 4.8,
    distance: '1.0 km',
    open: true,
    address: '321 Elm St, Montreal',
  },
];

export default function HomeScreen(props: any) {
  const [activeAction, setActiveAction] = useState(0);
  const [search, setSearch] = useState('');
  const [nearbyType, setNearbyType] = useState<'pharmacies' | 'hospitals'>('pharmacies');
  const router = useRouter();
  const anim = useRef(new Animated.Value(0)).current;

  const handleProfilePress = () => {
    if (props.goToProfile) {
      props.goToProfile();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  // Animate pill
  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: nearbyType === 'pharmacies' ? 0 : 1,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, [nearbyType]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroBg}>
          <TouchableOpacity
            style={styles.profileIconBtn}
            onPress={handleProfilePress}
            activeOpacity={0.8}
          >
            <Image source={{ uri: user.avatar }} style={styles.profileIcon} />
          </TouchableOpacity>
          <View style={styles.heroGlass}>
            <View style={styles.heroRow}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <View>
                <Text style={styles.heroGreeting}>Hello,</Text>
                <Text style={styles.heroName}>{user.name}</Text>
              </View>
            </View>
            <Text style={styles.heroQuestion}>How can we help you today?</Text>
            <View style={styles.heroSearchBar}>
              <FontAwesome name="search" size={20} color="#aaa" />
              <TextInput
                style={styles.heroSearchInput}
                placeholder="Search for medicines, pharmacies..."
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
            </View>
          </View>
        </View>
        {/* Location Card (subtle) */}
        <View style={styles.weatherCard}>
          <View>
            <Text style={styles.weatherLocation}>Montreal</Text>
            <Text style={styles.weatherStatus}>Partly Cloudy</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.weatherTemp}>-10°</Text>
            <Text style={styles.weatherRange}>H:22°  L:12°</Text>
          </View>
        </View>
        {/* Quick Actions Carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsCarousel}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={action.title}
              style={[styles.quickActionCard, activeAction === idx && styles.quickActionActive, { backgroundColor: action.color }]}
              onPress={() => {
                if (props.navigation && props.navigation.navigate) {
                  props.navigation.navigate(action.route);
                }
                setActiveAction(idx);
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.quickActionIconBg, activeAction === idx && { backgroundColor: '#8B5CF6' }] }>
                <FontAwesome name={action.icon as FontAwesomeIconName} size={28} color={activeAction === idx ? '#fff' : '#8B5CF6'} />
              </View>
              <Text style={styles.quickActionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Map Preview (segmented control) */}
        <View style={styles.mapPreview}>
          <View style={styles.segmentedControlWrapper}>
            <View style={styles.segmentedControlBg}>
              <Animated.View
                style={[
                  styles.segmentedControlPill,
                  {
                    left: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['1.5%', '50.5%'],
                    }),
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.segmentedControlBtn}
                onPress={() => setNearbyType('pharmacies')}
                activeOpacity={0.8}
              >
                <FontAwesome name="map" size={18} color={nearbyType === 'pharmacies' ? '#8B5CF6' : '#aaa'} />
                <Text style={[styles.segmentedControlText, nearbyType === 'pharmacies' && styles.segmentedControlTextActive]}>Pharmacies</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.segmentedControlBtn}
                onPress={() => setNearbyType('hospitals')}
                activeOpacity={0.8}
              >
                <FontAwesome name="hospital-o" size={18} color={nearbyType === 'hospitals' ? '#8B5CF6' : '#aaa'} />
                <Text style={[styles.segmentedControlText, nearbyType === 'hospitals' && styles.segmentedControlTextActive]}>Hospitals</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.mapGradient}>
            <FontAwesome name={nearbyType === 'pharmacies' ? 'map' : 'hospital-o'} size={40} color="#8B5CF6" />
            <Text style={styles.mapText}>
              See nearby {nearbyType === 'pharmacies' ? 'pharmacies' : 'hospitals'}
            </Text>
          </View>
        </View>
        {/* Featured List (pharmacies or hospitals) */}
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured {nearbyType === 'pharmacies' ? 'Pharmacies' : 'Hospitals'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(nearbyType === 'pharmacies' ? featuredPharmacies : featuredHospitals).map((item, idx) => (
              <TouchableOpacity 
                key={item.name} 
                style={styles.pharmacyCard}
                onPress={() => {
                  if (nearbyType === 'pharmacies') {
                    console.log('Featured pharmacy pressed:', item.name);
                    router.push({
                      pathname: '/pharmacy-details-modal',
                      params: {
                        pharmacyName: item.name,
                        pharmacyImage: item.image,
                        pharmacyRating: item.rating.toString(),
                        pharmacyDistance: item.distance,
                        pharmacyAddress: 'Featured Pharmacy Address', // Default address for featured pharmacies
                        pharmacyOpen: item.open ? 'true' : 'false'
                      }
                    });
                  } else if (nearbyType === 'hospitals') {
                    console.log('Featured hospital pressed:', item.name);
                    router.push({
                      pathname: '/hospital-details-modal',
                      params: {
                        hospitalName: item.name,
                        hospitalImage: item.image,
                        hospitalRating: item.rating.toString(),
                        hospitalDistance: item.distance,
                        hospitalAddress: 'Featured Hospital Address', // Default address for featured hospitals
                        hospitalOpen: item.open ? 'true' : 'false'
                      }
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.image }} style={styles.pharmacyImage} />
                <Text style={styles.pharmacyName}>{item.name}</Text>
                <Text style={styles.pharmacyDistance}>{item.distance} • <Text style={{ color: item.open ? '#8B5CF6' : '#f44336' }}>{item.open ? 'Open' : 'Closed'}</Text></Text>
                <View style={styles.pharmacyRatingRow}>
                  <FontAwesome name="star" size={14} color="#FFD700" />
                  <Text style={styles.pharmacyRating}>{item.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Pharmacies Nearby Section */}
        {nearbyType === 'pharmacies' && (
          <View style={styles.nearbySection}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => router.push('/(tabs)/pharmacies')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Pharmacies Nearby</Text>
              <FontAwesome name="angle-right" size={16} color="#43e97b" />
            </TouchableOpacity>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nearbyPharmacies.map((pharmacy, idx) => (
              <TouchableOpacity 
                key={pharmacy.name} 
                style={styles.nearbyPharmacyCard}
                onPress={() => {
                  console.log('Pharmacy card pressed:', pharmacy.name);
                  console.log('Attempting to navigate to pharmacy details...');
                  router.push({
                    pathname: '/pharmacy-details-modal',
                    params: {
                      pharmacyName: pharmacy.name,
                      pharmacyImage: pharmacy.image,
                      pharmacyRating: pharmacy.rating.toString(),
                      pharmacyDistance: pharmacy.distance,
                      pharmacyAddress: pharmacy.address,
                      pharmacyOpen: pharmacy.open ? 'true' : 'false'
                    }
                  });
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: pharmacy.image }} style={styles.nearbyPharmacyImage} />
                                  <View style={styles.nearbyPharmacyInfo}>
                    <Text style={styles.nearbyPharmacyName}>{pharmacy.name}</Text>
                    <Text style={styles.nearbyPharmacyAddress}>{pharmacy.address}</Text>
                    <View style={styles.nearbyPharmacyDetails}>
                      <Text style={styles.nearbyPharmacyDistance}>{pharmacy.distance}</Text>
                      <Text style={[styles.nearbyPharmacyStatus, { color: pharmacy.open ? '#8B5CF6' : '#f44336' }]}>
                        {pharmacy.open ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                    <View style={styles.nearbyPharmacyRatingRow}>
                      <FontAwesome name="star" size={12} color="#FFD700" />
                      <Text style={styles.nearbyPharmacyRating}>{pharmacy.rating}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {/* Emergency Contact Button/Section */}
        <View style={styles.emergencySection}>
          <TouchableOpacity style={styles.emergencyCard} activeOpacity={0.85}>
            <FontAwesome name="phone" size={22} color="#fff" style={styles.emergencyIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency Contact</Text>
              <Text style={styles.emergencyText}>Call 911 or your local emergency number</Text>
            </View>
            <FontAwesome name="angle-right" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroBg: {
    width: '100%',
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#f7fafd',
  },
  profileIconBtn: {
    position: 'absolute',
    top: 54,
    right: 28,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 3,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroGlass: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroGreeting: {
    fontSize: 18,
    color: '#222',
    opacity: 0.7,
  },
  heroName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  heroQuestion: {
    fontSize: 18,
    color: '#333',
    marginTop: 8,
    marginBottom: 16,
    fontWeight: '600',
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  heroSearchInput: {
    flex: 1,
    color: '#222',
    fontSize: 16,
    marginLeft: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  weatherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: -32,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#f7fafd',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  weatherLocation: {
    color: '#222',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  weatherStatus: {
    color: '#43e97b',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherTemp: {
    color: '#222',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  weatherRange: {
    color: '#aaa',
    fontSize: 13,
    opacity: 0.8,
  },
  quickActionsCarousel: {
    marginTop: 24,
    paddingLeft: 16,
    minHeight: 120,
  },
  quickActionCard: {
    width: 110,
    height: 110,
    backgroundColor: '#f5f6fa',
    borderRadius: 24,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickActionActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#fff',
  },
  quickActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
  },
  quickActionText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
    textAlign: 'center',
  },
  mapPreview: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  segmentedControlWrapper: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  segmentedControlBg: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 3,
    width: '90%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedControlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 2,
    borderRadius: 22,
  },
  segmentedControlPill: {
    position: 'absolute',
    top: 3,
    width: '48%',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  segmentedControlText: {
    marginLeft: 6,
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  segmentedControlTextActive: {
    color: '#000',
  },
  mapGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#f7fafd',
  },
  mapText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 16,
  },
  featuredSection: {
    marginTop: 32,
    marginBottom: 100,
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginRight: 8,
  },
  pharmacyCard: {
    width: 170,
    backgroundColor: '#fff',
    marginRight: 18,
    padding: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  pharmacyImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#222',
  },
  pharmacyDistance: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 2,
  },
  pharmacyRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pharmacyRating: {
    fontSize: 13,
    color: '#222',
    marginLeft: 4,
    fontWeight: '600',
  },
  nearbySection: {
    marginTop: -16,
    marginBottom: 100,
    marginLeft: 16,
  },
  nearbyPharmacyCard: {
    width: 280,
    backgroundColor: '#fff',
    marginRight: 18,
    padding: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyPharmacyImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  nearbyPharmacyInfo: {
    flex: 1,
  },
  nearbyPharmacyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#222',
  },
  nearbyPharmacyAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  nearbyPharmacyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nearbyPharmacyDistance: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  nearbyPharmacyStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  nearbyPharmacyRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyPharmacyRating: {
    fontSize: 12,
    color: '#222',
    marginLeft: 4,
    fontWeight: '600',
  },
  emergencySection: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e53935',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyIcon: {
    marginRight: 18,
  },
  emergencyTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.9,
  },
});
