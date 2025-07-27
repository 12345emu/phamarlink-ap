import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, View, Text, Platform, Alert, Linking, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const GLASS_BG = 'rgba(255,255,255,0.7)';
const SHADOW = '#3498db';

interface Medicine {
  id: number;
  name: string;
  description: string;
  price: number;
  prescription: boolean;
  category: string;
  image: string;
}

export default function PharmacyDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [addedToCart, setAddedToCart] = useState<Set<number>>(new Set());
  const [loadingItem, setLoadingItem] = useState<number | null>(null);
  const [medicineSearch, setMedicineSearch] = useState('');

  const pharmacy = {
    name: params.pharmacyName as string || 'CityMed Pharmacy',
    image: params.pharmacyImage as string || 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80',
    rating: parseFloat(params.pharmacyRating as string) || 4.5,
    distance: params.pharmacyDistance as string || '1,2 km',
    address: params.pharmacyAddress as string || '456 Oak Ave, Accra',
    isOpen: params.pharmacyOpen === 'true',
    phone: '+233-555-0123',
    email: 'info@citymedpharmacy.com',
    license: 'PHM-2024-001',
    pharmacist: 'Dr. Kwame Asante',
    id: params.id as string || '1',
  };

  const services = [
    {
      id: 1,
      name: "Prescription Filling",
      icon: "medkit",
      description: "Fast prescription processing",
    },
    {
      id: 2,
      name: "Health Consultations",
      icon: "stethoscope",
      description: "Professional health advice",
    },
    {
      id: 3,
      name: "Delivery Service",
      icon: "truck",
      description: "Same-day delivery available",
    },
    {
      id: 4,
      name: "Insurance Accepted",
      icon: "credit-card",
      description: "Major insurance providers",
    },
    {
      id: 5,
      name: "Vaccinations",
      icon: "syringe",
      description: "Flu shots and immunizations",
    },
    {
      id: 6,
      name: "Health Monitoring",
      icon: "heartbeat",
      description: "Blood pressure, glucose testing",
    },
  ];

  const medicineCategories = [
    {
      id: 1,
      name: "Pain Relief",
      icon: "medkit",
      medicines: [
        { id: 1, name: "Paracetamol 500mg", price: "GHS 10", prescription: false },
        { id: 2, name: "Ibuprofen 400mg", price: "GHS 15", prescription: false },
        { id: 3, name: "Aspirin 100mg", price: "GHS 8", prescription: false },
      ]
    },
    {
      id: 2,
      name: "Antibiotics",
      icon: "shield",
      medicines: [
        { id: 4, name: "Amoxicillin 250mg", price: "GHS 25", prescription: true },
        { id: 5, name: "Azithromycin 500mg", price: "GHS 35", prescription: true },
        { id: 6, name: "Ciprofloxacin 500mg", price: "GHS 30", prescription: true },
      ]
    },
    {
      id: 3,
      name: "Vitamins & Supplements",
      icon: "leaf",
      medicines: [
        { id: 7, name: "Vitamin D3 1000IU", price: "GHS 20", prescription: false },
        { id: 8, name: "Vitamin C 500mg", price: "GHS 12", prescription: false },
        { id: 9, name: "Iron Supplements", price: "GHS 18", prescription: false },
      ]
    },
    {
      id: 4,
      name: "First Aid",
      icon: "bandage",
      medicines: [
        { id: 10, name: "Bandages", price: "GHS 8", prescription: false },
        { id: 11, name: "Antiseptic Solution", price: "GHS 12", prescription: false },
        { id: 12, name: "Pain Relief Gel", price: "GHS 15", prescription: false },
      ]
    },
  ];

  const pharmacists = [
    {
      id: 1,
      name: "Dr. Kwame Asante",
      specialty: "Clinical Pharmacist",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      available: true,
      experience: "8 years",
    },
    {
      id: 2,
      name: "Pharm. Sarah Mensah",
      specialty: "Community Pharmacist",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      available: true,
      experience: "5 years",
    },
    {
      id: 3,
      name: "Pharm. Michael Osei",
      specialty: "Consultant Pharmacist",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
      available: false,
      experience: "12 years",
    },
  ];

  const handleCall = () => {
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
              Linking.openURL(`tel:${phoneNumber}`);
            },
          },
        ]
      );
    } else {
      Alert.alert('Phone Number Unavailable', 'Phone number is not available for this pharmacy.');
    }
  };
  
  const handleDirections = () => {
    router.push({
      pathname: '/pharmacy-map-modal',
      params: {
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        latitude: params.latitude,
        longitude: params.longitude,
        image: pharmacy.image,
        isOpen: pharmacy.isOpen ? 'true' : 'false',
      }
    });
  };
  
  const handleOrder = () => {
    router.push('/(tabs)/orders');
  };

  const handleAddToCart = (medicine: any) => {
    setLoadingItem(medicine.id);
    
    // Simulate loading
    setTimeout(() => {
      addToCart({
        id: medicine.id,
        name: medicine.name,
        price: parseFloat(medicine.price.replace('GHS ', '')),
        description: medicine.name,
        prescription: medicine.prescription,
        category: 'general',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
      });
      
      setAddedToCart(prev => new Set(prev).add(medicine.id));
      setLoadingItem(null);
      
      Alert.alert('Added to Cart', `${medicine.name} has been added to your cart!`);
    }, 500);
  };

  const handleChatWithPharmacist = (pharmacist: any) => {
    if (pharmacist.available) {
      router.push('/(tabs)/chat');
    } else {
      Alert.alert('Pharmacist Unavailable', `${pharmacist.name} is currently not available for chat.`);
    }
  };

  const handleEmail = () => {
    const emailAddress = pharmacy.email;
    if (emailAddress) {
      Alert.alert(
        'Email Pharmacy',
        `Would you like to send an email to ${pharmacy.name} at ${emailAddress}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Email',
            onPress: () => {
              const subject = encodeURIComponent('Inquiry from PharmaLink App');
              const body = encodeURIComponent(`Hello ${pharmacy.name},\n\nI would like to inquire about your services.\n\nBest regards,\nPharmaLink User`);
              Linking.openURL(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
            },
          },
        ]
      );
    } else {
      Alert.alert('Email Unavailable', 'Email address is not available for this pharmacy.');
    }
  };

  const handleDelivery = () => {
    Alert.alert(
      'Request Delivery',
      `Would you like to request delivery service from ${pharmacy.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Delivery',
          onPress: () => {
            // Log the delivery request
            console.log(`Delivery request submitted for ${pharmacy.name}`);
            
            Alert.alert(
              'Delivery Request Submitted',
              `Your delivery request has been submitted to ${pharmacy.name}. Their team will contact you shortly to confirm your order and delivery details.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Could navigate to delivery form or order page here
                    console.log('User acknowledged delivery request');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Filter medicines based on search query
  const getFilteredMedicineCategories = () => {
    if (!medicineSearch.trim()) {
      return medicineCategories;
    }

    const searchLower = medicineSearch.toLowerCase();
    return medicineCategories.map(category => ({
      ...category,
      medicines: category.medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchLower) ||
        category.name.toLowerCase().includes(searchLower)
      )
    })).filter(category => category.medicines.length > 0);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header with Logo and Name */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <FontAwesome name="medkit" size={40} color="#fff" />
            </View>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
          <View style={styles.locationInfo}>
            <FontAwesome name="map-marker" size={14} color="#e74c3c" />
            <Text style={styles.locationText}>Pharmacy • {pharmacy.distance}</Text>
            </View>
          <View style={styles.pharmacyDetails}>
            <Text style={styles.pharmacyDetail}>License: {pharmacy.license}</Text>
            <Text style={styles.pharmacyDetail}>Pharmacist: {pharmacy.pharmacist}</Text>
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 5.5650,
              longitude: -0.2100,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            mapType="standard"
            userInterfaceStyle="light"
          >
            <Marker
              coordinate={{
                latitude: 5.5650,
                longitude: -0.2100,
              }}
              title={pharmacy.name}
              description="Pharmacy"
              pinColor="#3498db"
            />
          </MapView>
        </View>

        {/* Get Directions Button */}
        <View style={styles.directionsButtonContainer}>
          <TouchableOpacity 
            style={styles.directionsButton}
            onPress={handleDirections}
            activeOpacity={0.8}
          >
            <FontAwesome name="map-marker" size={16} color="#fff" />
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleCall}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="phone" size={24} color={ACCENT} />
              </View>
              <Text style={styles.quickActionText}>Call Pharmacy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleEmail}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="envelope" size={24} color={ACCENT} />
              </View>
              <Text style={styles.quickActionText}>Send Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleDelivery}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="truck" size={24} color={ACCENT} />
              </View>
              <Text style={styles.quickActionText}>Request Delivery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleOrder}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="shopping-cart" size={24} color={ACCENT} />
              </View>
              <Text style={styles.quickActionText}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.servicesList}>
            {services.map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <View style={styles.serviceIcon}>
                  <FontAwesome name={service.icon as any} size={20} color={ACCENT} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>
              </View>
            ))}
            </View>
        </View>

        {/* Medicine Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Medicine Categories</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={16} color="#95a5a6" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines..."
              placeholderTextColor="#95a5a6"
              value={medicineSearch}
              onChangeText={setMedicineSearch}
              returnKeyType="search"
            />
            {medicineSearch.length > 0 && (
              <TouchableOpacity 
                onPress={() => setMedicineSearch('')}
                style={styles.clearSearchButton}
                activeOpacity={0.7}
              >
                <FontAwesome name="times" size={16} color="#95a5a6" />
              </TouchableOpacity>
            )}
          </View>
          
          {getFilteredMedicineCategories().map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <FontAwesome name={category.icon as any} size={20} color={ACCENT} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <View style={styles.medicinesList}>
                {category.medicines.map((medicine) => (
                  <View key={medicine.id} style={styles.medicineItem}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                      <Text style={styles.medicinePrice}>{medicine.price}</Text>
                      {medicine.prescription && (
                        <View style={styles.prescriptionBadge}>
                          <FontAwesome name="shield" size={10} color="white" />
                          <Text style={styles.prescriptionText}>Rx</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={[
                        styles.addToCartButton,
                        addedToCart.has(medicine.id) && styles.addedToCartButton,
                        loadingItem === medicine.id && styles.loadingButton
                      ]}
                      onPress={() => handleAddToCart(medicine)}
                      activeOpacity={0.7}
                      disabled={loadingItem === medicine.id}
                    >
                      {loadingItem === medicine.id ? (
                        <View style={styles.loadingContainer}>
                          <FontAwesome name="spinner" size={14} color="#fff" style={styles.spinningIcon} />
                          <Text style={styles.addToCartButtonText}>Adding...</Text>
                        </View>
                      ) : addedToCart.has(medicine.id) ? (
                        <View style={styles.addedContainer}>
                          <FontAwesome name="check" size={14} color="#fff" />
                          <Text style={styles.addToCartButtonText}>Added</Text>
                        </View>
                      ) : (
                        <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Chat with Pharmacists Section */}
        <View style={styles.pharmacistsSection}>
          <Text style={styles.sectionTitle}>Chat with Pharmacists</Text>
          <View style={styles.pharmacistsList}>
            {pharmacists.map((pharmacist) => (
              <TouchableOpacity 
                key={pharmacist.id} 
                style={styles.pharmacistItem}
                onPress={() => handleChatWithPharmacist(pharmacist)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: pharmacist.avatar }} style={styles.pharmacistAvatar} />
                <View style={styles.pharmacistInfo}>
                  <Text style={styles.pharmacistName}>{pharmacist.name}</Text>
                  <Text style={styles.pharmacistSpecialty}>{pharmacist.specialty}</Text>
                  <Text style={styles.pharmacistExperience}>{pharmacist.experience} experience</Text>
                </View>
                <View style={styles.pharmacistStatus}>
                  <View style={[styles.statusDot, { backgroundColor: pharmacist.available ? '#43e97b' : '#e74c3c' }]} />
                  <Text style={styles.statusText}>{pharmacist.available ? 'Available' : 'Busy'}</Text>
                </View>
              </TouchableOpacity>
              ))}
            </View>
        </View>

        {/* Emergency Contact Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={handleCall}>
          <FontAwesome name="phone" size={18} color="#fff" />
          <Text style={styles.emergencyButtonText}>Emergency Contact</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  pharmacyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  pharmacyDetails: {
    alignItems: 'center',
  },
  pharmacyDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  mapSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    height: 200,
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
    bottom: 16,
    left: 16,
    right: 16,
  },
  directionsButtonContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  directionsButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActionsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  servicesSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  servicesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  categoriesSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  clearSearchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  medicinesList: {
    paddingHorizontal: 16,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  medicineInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginRight: 8,
  },
  medicinePrice: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8,
  },
  prescriptionBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prescriptionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  addToCartButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addedToCartButton: {
    backgroundColor: '#43e97b',
  },
  loadingButton: {
    backgroundColor: '#95a5a6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinningIcon: {
    marginRight: 6,
    transform: [{ rotate: '360deg' }],
  },
  addedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacistsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  pharmacistsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pharmacistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  pharmacistAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  pharmacistInfo: {
    flex: 1,
  },
  pharmacistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  pharmacistSpecialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  pharmacistExperience: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  pharmacistStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e53935',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});