import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, View, Text, Platform, Alert, Linking, TextInput, FlatList } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';
import { facilitiesService, Facility } from '../services/facilitiesService';
import { professionalsService, HealthcareProfessional } from '../services/professionalsService';
import { authService } from '../services/authService';
import RateFacilityModal from './rate-facility-modal';
import { API_CONFIG } from '../constants/API';

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

interface DatabaseMedicine {
  id: number;
  name: string;
  generic_name?: string;
  category: string;
  prescription_required: boolean;
  dosage_form?: string;
  strength?: string;
  description?: string;
  manufacturer?: string;
  stock_quantity: number;
  price: number;
  discount_price?: number;
  is_available: boolean;
}

export default function PharmacyDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const [addedToCart, setAddedToCart] = useState<Set<number>>(new Set());
  const [loadingItem, setLoadingItem] = useState<number | null>(null);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [facilityMedicines, setFacilityMedicines] = useState<any>(null);
  const [medicinesLoading, setMedicinesLoading] = useState(false);
  const [facilityProfessionals, setFacilityProfessionals] = useState<HealthcareProfessional[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Fetch facility data, medicines, and professionals from API
  useEffect(() => {
    const fetchFacilityData = async () => {
      try {
        const facilityId = params.id as string;
        if (facilityId) {
          console.log('🔍 Fetching facility data for ID:', facilityId);
          
          // Fetch facility data
          const facilityResponse = await facilitiesService.getFacilityById(facilityId);
          if (facilityResponse.success && facilityResponse.data) {
            console.log('✅ Facility data fetched:', facilityResponse.data);
            setFacility(facilityResponse.data);
          } else {
            console.log('❌ Failed to fetch facility data:', facilityResponse.message);
          }

          // Fetch facility medicines
          setMedicinesLoading(true);
          const medicinesResponse = await facilitiesService.getFacilityMedicines(facilityId);
          if (medicinesResponse.success && medicinesResponse.data) {
            console.log('✅ Facility medicines fetched:', medicinesResponse.data);
            setFacilityMedicines(medicinesResponse.data);
          } else {
            console.log('❌ Failed to fetch facility medicines:', medicinesResponse.message);
          }

          // Fetch facility professionals
          setProfessionalsLoading(true);
          const professionalsResponse = await professionalsService.getProfessionalsByFacility(facilityId, 10);
          if (professionalsResponse.success && professionalsResponse.data) {
            console.log('✅ Facility professionals fetched:', professionalsResponse.data);
            setFacilityProfessionals(professionalsResponse.data);
          } else {
            console.log('❌ Failed to fetch facility professionals:', professionalsResponse.message);
          }
        } else {
          console.log('❌ No facility ID provided in params');
        }
      } catch (error) {
        console.error('Error fetching facility data:', error);
      } finally {
        setLoading(false);
        setMedicinesLoading(false);
        setProfessionalsLoading(false);
      }
    };

    fetchFacilityData();
  }, [params.id]);

  // Fallback pharmacy data if API fails
  const pharmacy = {
    name: facility?.name || params.pharmacyName as string || 'CityMed Pharmacy',
    image: params.pharmacyImage as string || 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80',
    rating: facility?.rating || parseFloat(params.pharmacyRating as string) || 4.5,
    distance: params.pharmacyDistance as string || '1.2 km',
    address: facility?.address?.street || params.pharmacyAddress as string || '456 Pharmacy Street, Osu',
    isOpen: facility?.isOpen || params.pharmacyOpen === 'true',
    phone: facility?.phone || params.phone as string || '+233-555-0123',
    email: facility?.email || 'info@citymedpharmacy.com',
    license: 'PHM-2024-001',
    pharmacist: 'Dr. Kwame Asante',
    id: facility?.id || params.id as string || '1',
  };

  // Transform database services to display format
  const getServicesFromDatabase = () => {
    if (!facility?.services || facility.services.length === 0) {
      return [
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
    }

    // Map service names to icons
    const serviceIconMap: { [key: string]: string } = {
      'Prescription Filling': 'medkit',
      'Health Consultations': 'stethoscope',
      'Delivery Service': 'truck',
      'Insurance Accepted': 'credit-card',
      'Vaccinations': 'syringe',
      'Health Monitoring': 'heartbeat',
      'Over-the-counter': 'pills',
      'Emergency Care': 'ambulance',
      'Surgery': 'scissors',
      'Maternity': 'baby',
      'Pediatrics': 'child',
      'Cardiology': 'heartbeat',
      'Neurology': 'brain',
      'General Consultation': 'stethoscope',
      'Specialized Care': 'user-md',
      'Laboratory': 'flask',
      'X-Ray': 'image',
      'Ultrasound': 'image',
    };

    return facility.services.map((service, index) => ({
      id: index + 1,
      name: service,
      icon: serviceIconMap[service] || 'medkit',
      description: `${service} services available`,
    }));
  };

  const services = getServicesFromDatabase();

  // Get facility image URL for specific index
  const getFacilityImageUrl = (index: number = 0) => {
    if (facility?.images && facility.images.length > 0) {
      const imagePath = facility.images[index];
      // Convert relative path to full URL
      if (imagePath.startsWith('/uploads/')) {
        // Remove /api from BASE_URL for static file serving
        const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
        return `${baseUrl}${imagePath}`;
      }
      return imagePath;
    }
    // Fallback to default pharmacy image
    return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80';
  };

  // Get all facility images
  const getFacilityImages = () => {
    if (facility?.images && facility.images.length > 0) {
      return facility.images.map((imagePath, index) => {
        if (imagePath.startsWith('/uploads/')) {
          // Remove /api from BASE_URL for static file serving
          const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
          return `${baseUrl}${imagePath}`;
        }
        return imagePath;
      });
    }
    // Fallback to default pharmacy image
    return ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80'];
  };

  // Reset image index when facility changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [facility?.id]);

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



  const handleCall = () => {
    const phoneNumber = facility?.phone || pharmacy.phone;
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

  const handleEmergencyCall = () => {
    // Ghana emergency numbers
    const emergencyNumbers = {
      police: '191',
      ambulance: '193',
      fire: '192',
      general: '112' // General emergency number
    };

    Alert.alert(
      'Emergency Services',
      'Which emergency service do you need?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Police (191)',
          onPress: () => {
            Alert.alert(
              'Call Police',
              'Are you sure you want to call the police emergency number (191)?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => Linking.openURL(`tel:${emergencyNumbers.police}`) }
              ]
            );
          },
        },
        {
          text: 'Ambulance (193)',
          onPress: () => {
            Alert.alert(
              'Call Ambulance',
              'Are you sure you want to call the ambulance emergency number (193)?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => Linking.openURL(`tel:${emergencyNumbers.ambulance}`) }
              ]
            );
          },
        },
        {
          text: 'Fire (192)',
          onPress: () => {
            Alert.alert(
              'Call Fire Service',
              'Are you sure you want to call the fire service emergency number (192)?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => Linking.openURL(`tel:${emergencyNumbers.fire}`) }
              ]
            );
          },
        },
        {
          text: 'General (112)',
          onPress: () => {
            Alert.alert(
              'Call General Emergency',
              'Are you sure you want to call the general emergency number (112)?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => Linking.openURL(`tel:${emergencyNumbers.general}`) }
              ]
            );
          },
        },
      ]
    );
  };
  
  const handleDirections = () => {
    // Get the most accurate coordinates available
    let latitude = facility?.coordinates?.latitude || 
                  (params.latitude ? parseFloat(params.latitude as string) : null) ||
                  5.5650;
    
    let longitude = facility?.coordinates?.longitude || 
                   (params.longitude ? parseFloat(params.longitude as string) : null) ||
                   -0.2100;

    // Validate coordinates are valid numbers
    if (isNaN(latitude) || isNaN(longitude)) {
      latitude = 5.5650;
      longitude = -0.2100;
      console.warn('⚠️ Invalid coordinates detected, using default coordinates');
    }

    console.log('🔍 Navigating to map with coordinates:', { latitude, longitude });
    console.log('🔍 Facility data:', {
      facilityId: facility?.id,
      facilityName: facility?.name,
      facilityCoordinates: facility?.coordinates,
      facilityAddress: facility?.address,
      facilityPhone: facility?.phone,
      facilityEmail: facility?.email
    });
    console.log('🔍 Params data:', {
      paramsLatitude: params.latitude,
      paramsLongitude: params.longitude,
      pharmacyName: pharmacy.name,
      pharmacyAddress: pharmacy.address
    });
    
    // Navigate to the pharmacy map modal with pharmacy data
    router.push({
      pathname: '/pharmacy-map-modal',
      params: {
        pharmacyName: pharmacy.name,
        pharmacyAddress: facility?.address?.street || pharmacy.address,
        pharmacyPhone: facility?.phone || pharmacy.phone,
        pharmacyRating: pharmacy.rating.toString(),
        pharmacyDistance: pharmacy.distance,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      }
    });
  };
  
  const handleOrder = () => {
    router.push('/(tabs)/orders');
  };

  const handleAddToCart = async (medicine: any) => {
    setLoadingItem(medicine.id);
    
    try {
      // Get pharmacy ID from params or facility
      const pharmacyId = parseInt(params.facilityId as string) || (facility?.id ? parseInt(facility.id.toString()) : 5);
      const pricePerUnit = parseFloat(medicine.price.replace('GHS ', ''));
      
      // If pharmacy_medicine_id is available, use it directly for better accuracy
      if (medicine.pharmacy_medicine_id) {
        // Use the new API format with pharmacy_medicine_id
        const cartData = {
          pharmacyMedicineId: medicine.pharmacy_medicine_id,
          quantity: 1
        };
        
        const response = await fetch('http://172.20.10.3:3000/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await authService.getStoredToken()}`
          },
          body: JSON.stringify(cartData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          setAddedToCart(prev => new Set(prev).add(medicine.id));
          Alert.alert('Added to Cart', `${medicine.name} has been added to your cart!`);
        } else {
          Alert.alert('Error', result.message || 'Failed to add item to cart. Please try again.');
        }
      } else {
        // Fallback to old method
        const success = await addToCart(medicine, pharmacyId, pricePerUnit, 1);
        
        if (success) {
          setAddedToCart(prev => new Set(prev).add(medicine.id));
          Alert.alert('Added to Cart', `${medicine.name} has been added to your cart!`);
        } else {
          Alert.alert('Error', 'Failed to add item to cart. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    } finally {
      setLoadingItem(null);
    }
  };

  const handleChatWithPharmacist = (professional: any) => {
    if (professional.is_available) {
      // Navigate to chat page with professional information
      router.push({
        pathname: '/(tabs)/chat',
        params: {
          professionalId: professional.id.toString(),
          professionalName: professional.full_name,
          professionalRole: professional.specialty.toLowerCase().includes('pharmacist') ? 'pharmacist' : 'doctor',
          facilityName: facility?.name || pharmacy.name,
          professionalSpecialty: professional.specialty,
          professionalAvatar: professionalsService.getProfessionalIcon(professional.specialty),
          professionalRating: professional.rating.toString(),
          professionalExperience: professional.experience_years.toString()
        }
      });
    } else {
      Alert.alert('Professional Unavailable', `${professional.full_name} is currently not available for chat.`);
    }
  };

  const handleEmail = () => {
    const emailAddress = facility?.email || pharmacy.email;
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
          text: 'Select Medicines',
          onPress: () => {
            // Navigate to checkout with delivery option
            router.push({
              pathname: '/(tabs)/checkout',
              params: {
                deliveryMode: 'true',
                facilityId: params.facilityId as string,
                facilityName: pharmacy.name
              }
            });
          },
        },
        {
          text: 'Quick Delivery',
          onPress: () => {
            // For quick delivery, show a form to collect delivery details
            Alert.prompt(
              'Quick Delivery Request',
              'Please enter your delivery address:',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Submit',
                  onPress: (address) => {
                    if (address && address.trim()) {
                      // Submit quick delivery request
                      submitDeliveryRequest({
                        facilityId: params.facilityId as string,
                        facilityName: pharmacy.name,
                        deliveryAddress: address.trim(),
                        deliveryType: 'quick',
                        status: 'pending'
                      });
                    } else {
                      Alert.alert('Error', 'Please enter a valid delivery address.');
                    }
                  },
                },
              ],
              'plain-text',
              '',
              'Enter your full delivery address'
            );
          },
        },
      ]
    );
  };

  const submitDeliveryRequest = (deliveryData: any) => {
    // Simulate API call for delivery request
    console.log('Submitting delivery request:', deliveryData);
    
    // Show loading state
            Alert.alert(
      'Processing...',
      'Submitting your delivery request...',
      [],
      { cancelable: false }
    );

    // Simulate API delay
    setTimeout(() => {
      Alert.alert(
        'Delivery Request Submitted!',
        `Your delivery request has been submitted to ${pharmacy.name}.\n\nRequest ID: DR-${Date.now().toString().slice(-6)}\n\nTheir team will contact you within 30 minutes to confirm your order and delivery details.`,
        [
          {
            text: 'View Request',
                  onPress: () => {
              // Could navigate to a delivery tracking page
              console.log('Navigate to delivery tracking');
            },
          },
          {
            text: 'OK',
            onPress: () => {
              console.log('Delivery request acknowledged');
          },
        },
      ]
    );
    }, 2000);
  };

  // Transform database medicines to display format
  const getMedicineCategoriesFromDatabase = () => {
    if (!facilityMedicines?.medicines_by_category) {
      return medicineCategories; // Fallback to hardcoded data
    }

    const categories = Object.keys(facilityMedicines.medicines_by_category).map(categoryName => ({
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName,
      icon: getCategoryIcon(categoryName),
      medicines: facilityMedicines.medicines_by_category[categoryName].map((medicine: DatabaseMedicine, index: number) => ({
        id: medicine.id,
        name: medicine.name,
        price: `GHS ${medicine.price}`,
        prescription: medicine.prescription_required,
        strength: medicine.strength,
        stock: medicine.stock_quantity,
        description: medicine.description
      }))
    }));

    return categories;
  };

  // Get icon for medicine category
  const getCategoryIcon = (category: string): string => {
    const iconMap: { [key: string]: string } = {
      'Analgesic': 'medkit',
      'Antibiotic': 'shield',
      'NSAID': 'medkit',
      'Vitamin': 'leaf',
      'Supplement': 'leaf',
      'First Aid': 'bandage',
      'Pain Relief': 'medkit',
      'Antibiotics': 'shield',
      'Vitamins & Supplements': 'leaf',
    };
    return iconMap[category] || 'medkit';
  };

  // Filter medicines based on search query
  const getFilteredMedicineCategories = () => {
    const categories = getMedicineCategoriesFromDatabase();
    
    if (!medicineSearch.trim()) {
      return categories;
    }

    const searchLower = medicineSearch.toLowerCase();
    return categories.map(category => ({
      ...category,
      medicines: category.medicines.filter((medicine: any) =>
        medicine.name.toLowerCase().includes(searchLower) ||
        category.name.toLowerCase().includes(searchLower)
      )
    })).filter(category => category.medicines.length > 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pharmacy details...</Text>
        </View>
      </View>
    );
  }

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
            {facility?.phone && (
              <Text style={styles.pharmacyDetail}>Phone: {facility.phone}</Text>
            )}
            {facility?.email && (
              <Text style={styles.pharmacyDetail}>Email: {facility.email}</Text>
            )}
          </View>
        </View>

        {/* Facility Images with Swiping */}
        <View style={styles.facilityImageContainer}>
          <FlatList
            data={getFacilityImages()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              if (index !== currentImageIndex) {
                setCurrentImageIndex(index);
              }
            }}
            renderItem={({ item }) => (
              <Image 
                source={{ uri: item }}
                style={styles.facilityImage}
                resizeMode="cover"
              />
            )}
            keyExtractor={(item, index) => index.toString()}
          />
          
          {/* Pagination Dots */}
          {getFacilityImages().length > 1 && (
            <View style={styles.paginationContainer}>
              {getFacilityImages().map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive
                  ]}
                />
              ))}
            </View>
          )}
          
          {/* Image Counter */}
          {getFacilityImages().length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1} / {getFacilityImages().length}
              </Text>
            </View>
          )}
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
            
            <TouchableOpacity style={styles.quickActionCard} onPress={() => setShowRatingModal(true)}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="star" size={24} color="#f39c12" />
              </View>
              <Text style={styles.quickActionText}>Rate Facility</Text>
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

        {/* Chat with Pharmacists Section */}
        <View style={styles.professionalsSection}>
          <Text style={styles.sectionTitle}>Chat with Pharmacists</Text>
          {professionalsLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading professionals...</Text>
            </View>
          )}
          
          {!professionalsLoading && facilityProfessionals.length > 0 ? (
            <View style={styles.professionalsList}>
              {facilityProfessionals.map((professional) => (
                <View key={professional.id} style={styles.professionalItem}>
                  <View style={styles.professionalAvatar}>
                    <FontAwesome 
                      name={professionalsService.getProfessionalIcon(professional.specialty) as any} 
                      size={24} 
                      color={professionalsService.getProfessionalColor(professional.specialty)} 
                    />
                  </View>
                  <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>{professional.full_name}</Text>
                    <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>
                    <Text style={styles.professionalExperience}>{professional.experience_text}</Text>
                    <View style={styles.professionalRating}>
                      <FontAwesome name="star" size={12} color="#f39c12" />
                      <Text style={styles.ratingText}>
                        {professionalsService.formatRating(professional.rating)} ({professional.total_reviews} reviews)
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.chatButton}
                    onPress={() => handleChatWithPharmacist(professional)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="comments" size={16} color="#fff" />
                    <Text style={styles.chatButtonText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : !professionalsLoading && (
            <View style={styles.noProfessionalsContainer}>
              <Text style={styles.noProfessionalsText}>No pharmacists available at this pharmacy.</Text>
            </View>
          )}
        </View>

        {/* Medicine Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Medicine Categories</Text>
          {medicinesLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading medicines...</Text>
            </View>
          )}
          
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
                {category.medicines.map((medicine: any) => (
                  <TouchableOpacity 
                    key={medicine.id} 
                    style={styles.medicineItem}
                    onPress={() => {
                      router.push({
                        pathname: '/medicine-details-modal',
                        params: {
                          medicineId: medicine.id.toString(),
                          medicineName: medicine.name,
                          genericName: medicine.generic_name || '',
                          category: medicine.category,
                          prescriptionRequired: medicine.prescription_required?.toString() || 'false',
                          dosageForm: medicine.dosage_form || '',
                          strength: medicine.strength || '',
                          description: medicine.description || '',
                          manufacturer: medicine.manufacturer || '',
                          stockQuantity: medicine.stock_quantity?.toString() || '0',
                          price: medicine.price?.toString() || '0',
                          discountPrice: medicine.discount_price?.toString() || '',
                          isAvailable: medicine.is_available?.toString() || 'true',
                          medicineImage: medicine.image || ''
                        }
                      });
                    }}
                    activeOpacity={0.7}
                  >
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
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAddToCart(medicine);
                      }}
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
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>



        {/* Emergency Contact Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
          <FontAwesome name="phone" size={18} color="#fff" />
          <Text style={styles.emergencyButtonText}>Emergency Contact</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Rating Modal */}
      <RateFacilityModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        facilityId={facility?.id || params.id as string}
        facilityName={facility?.name || params.pharmacyName as string}
        facilityType={facility?.type || 'pharmacy'}
      />
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
  facilityImageContainer: {
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
    position: 'relative',
  },
  facilityImage: {
    width: width,
    height: '100%',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  imageCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  professionalsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  professionalsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  professionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  professionalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  professionalExperience: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
  },
  professionalRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  chatButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  noProfessionalsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noProfessionalsText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});