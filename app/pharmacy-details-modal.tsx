import React, { useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, View as RNView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');
const ACCENT = '#8B5CF6';
const GLASS_BG = 'rgba(255,255,255,0.7)';
const SHADOW = '#8B5CF6';

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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pharmacy = {
    name: params.name as string || 'Pharmacy',
    image: params.image as string || 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80',
    rating: parseFloat(params.rating as string) || 4.5,
    distance: params.distance as string || '0.5 km',
    address: params.address as string || '123 Main St, Montreal',
    isOpen: params.isOpen === 'true',
    phone: params.phone as string || '+1-555-0123',
    id: params.id as string || '1',
  };

  const medicines: Medicine[] = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      description: "Pain reliever and fever reducer",
      price: 5.99,
      prescription: false,
      category: "pain-relief",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      name: "Ibuprofen 400mg",
      description: "Anti-inflammatory pain reliever",
      price: 7.99,
      prescription: false,
      category: "pain-relief",
      image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      name: "Amoxicillin 250mg",
      description: "Antibiotic for bacterial infections",
      price: 15.99,
      prescription: true,
      category: "antibiotics",
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 4,
      name: "Vitamin D3 1000IU",
      description: "Supports bone health and immune system",
      price: 12.99,
      prescription: false,
      category: "vitamins",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 5,
      name: "Omeprazole 20mg",
      description: "Reduces stomach acid production",
      price: 18.99,
      prescription: true,
      category: "digestive",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80"
    }
  ];

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? 'star' : 'star-o'}
          size={18}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return stars;
  };

  const handleCall = () => {
    // Add real call logic here
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image source={{ uri: pharmacy.image }} style={styles.headerImage} />
          <LinearGradient colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.0)"]} style={styles.headerOverlay} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonGlass}>
              <FontAwesome name="arrow-left" size={22} color={ACCENT} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerContentGlass}>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
            <View style={styles.ratingRow}>
              {renderStars(pharmacy.rating)}
              <Text style={styles.ratingText}>({pharmacy.rating})</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCardGlass}>
          <RNView style={styles.infoRow}>
            <Animated.View style={[styles.openBadge, { transform: [{ scale: pulseAnim }] }]}> 
              <FontAwesome name="circle" size={12} color={pharmacy.isOpen ? ACCENT : '#f44336'} style={{ marginRight: 6 }} />
              <Text style={[styles.openBadgeText, { color: pharmacy.isOpen ? ACCENT : '#f44336' }]}>{pharmacy.isOpen ? 'Open Now' : 'Closed'}</Text>
            </Animated.View>
            <Text style={styles.distanceText}>{pharmacy.distance}</Text>
          </RNView>
          <Text style={styles.addressText}>{pharmacy.address}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.85}>
            <LinearGradient colors={[ACCENT, '#6D28D9']} style={styles.actionBtnGradient}>
              <FontAwesome name="phone" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDirections} activeOpacity={0.85}>
            <LinearGradient colors={[ACCENT, '#6D28D9']} style={styles.actionBtnGradient}>
              <FontAwesome name="map-marker" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionBtnText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOrder} activeOpacity={0.85}>
            <LinearGradient colors={[ACCENT, '#6D28D9']} style={styles.actionBtnGradient}>
              <FontAwesome name="shopping-cart" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionBtnText}>Order</Text>
          </TouchableOpacity>
        </View>

        {/* Operating Hours */}
        <View style={styles.sectionGlass}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <View style={styles.hoursTable}>
            <View style={styles.hourRow}><Text style={styles.hourDay}>Monday - Friday</Text><Text style={styles.hourTime}>8:00 AM - 9:00 PM</Text></View>
            <View style={styles.hourRow}><Text style={styles.hourDay}>Saturday</Text><Text style={styles.hourTime}>9:00 AM - 7:00 PM</Text></View>
            <View style={styles.hourRow}><Text style={styles.hourDay}>Sunday</Text><Text style={styles.hourTime}>10:00 AM - 6:00 PM</Text></View>
          </View>
        </View>

        {/* Services */}
        <View style={styles.sectionGlass}>
          <Text style={styles.sectionTitle}>Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.servicesRow}>
              <View style={styles.serviceCard}><FontAwesome name="medkit" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Prescription Filling</Text></View>
              <View style={styles.serviceCard}><FontAwesome name="heartbeat" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Health Consultations</Text></View>
              <View style={styles.serviceCard}><FontAwesome name="truck" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Delivery Service</Text></View>
              <View style={styles.serviceCard}><FontAwesome name="credit-card" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Insurance Accepted</Text></View>
            </View>
          </ScrollView>
        </View>

        {/* Medicines */}
        <View style={styles.sectionGlass}>
          <Text style={styles.sectionTitle}>Available Medicines</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.medicinesRow}>
              {medicines.map((medicine) => (
                <View key={medicine.id} style={styles.medicineCard}>
                  <Image source={{ uri: medicine.image }} style={styles.medicineImage} />
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDescription}>{medicine.description}</Text>
                    <View style={styles.medicineFooter}>
                      <View style={styles.medicinePricePill}>
                        <Text style={styles.medicinePrice}>${medicine.price}</Text>
                      </View>
                      {medicine.prescription && (
                        <View style={styles.prescriptionBadge}>
                          <FontAwesome name="shield" size={10} color="white" />
                          <Text style={styles.prescriptionText}>Rx</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.addToCartBtn}
                      onPress={() => addToCart(medicine)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[ACCENT, '#A855F7']}
                        style={styles.addToCartBtnGradient}
                      >
                        <FontAwesome name="plus" size={14} color="#fff" />
                        <Text style={styles.addToCartBtnText}>Add</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
      {/* Sticky Bottom Bar */}
      <View style={styles.stickyBar}>
        <TouchableOpacity style={styles.stickyBtn} onPress={handleOrder} activeOpacity={0.85}>
          <LinearGradient colors={[ACCENT, '#6D28D9']} style={styles.stickyBtnGradient}>
            <FontAwesome name="shopping-cart" size={20} color="#fff" />
            <Text style={styles.stickyBtnText}>Order Medicine</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stickyBtn} onPress={handleCall} activeOpacity={0.85}>
          <LinearGradient colors={[ACCENT, '#6D28D9']} style={styles.stickyBtnGradient}>
            <FontAwesome name="phone" size={20} color="#fff" />
            <Text style={styles.stickyBtnText}>Call</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    marginBottom: -32,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
    left: 18,
    zIndex: 10,
  },
  backButtonGlass: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 8,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  headerContentGlass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  pharmacyName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ratingText: {
    color: '#222',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  infoCardGlass: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 18,
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 18,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  openBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  distanceText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 15,
  },
  addressText: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 10,
    marginBottom: 18,
    backgroundColor: 'transparent',
  },
  actionBtn: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  actionBtnGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionGlass: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 18,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  hoursTable: {
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'transparent',
  },
  hourDay: {
    color: '#222',
    fontWeight: '500',
    fontSize: 14,
  },
  hourTime: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  serviceCard: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginRight: 14,
    width: 120,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  serviceCardText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  medicinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  medicineCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 24,
    padding: 0,
    marginRight: 20,
    width: 160,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.10)',
    overflow: 'hidden',
  },
  medicineImage: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8f9fa',
  },
  medicineInfo: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 14,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  medicineName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
    lineHeight: 18,
  },
  medicineDescription: {
    color: '#666',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 15,
  },
  medicineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  medicinePricePill: {
    backgroundColor: 'rgba(139,92,246,0.13)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginRight: 6,
    marginBottom: 6,
  },
  medicinePrice: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    fontSize: 15,
  },
  prescriptionBadge: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  prescriptionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 2,
  },
  addToCartBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  addToCartBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  addToCartBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 20,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyBtn: {
    flex: 1,
    marginHorizontal: 8,
  },
  stickyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 6,
  },
  stickyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 10,
  },
});