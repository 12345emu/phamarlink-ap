import React, { useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Platform, Animated } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ACCENT = '#8B5CF6';
const GLASS_BG = 'rgba(255,255,255,0.85)';
const DARK = '#18181B';
const SHADOW = '#8B5CF6';

export default function HospitalDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const hospital = {
    name: params.hospitalName as string || 'Hospital',
    image: params.hospitalImage as string || 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=400&q=80',
    rating: parseFloat(params.hospitalRating as string) || 4.5,
    distance: params.hospitalDistance as string || '0.5 km',
    address: params.hospitalAddress as string || '123 Main St, Montreal',
    isOpen: params.hospitalOpen === 'true',
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? 'star' : 'star-o'}
          size={16}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return stars;
  };

  const handleCall = () => {
    Alert.alert('Call Hospital', `Would call ${hospital.name}`);
  };

  const handleDirections = () => {
    Alert.alert('Directions', `Would open directions to ${hospital.name}`);
  };

  const handleEmergency = () => {
    Alert.alert('Emergency', 'Call 911 for medical emergencies');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerContainer}>
          <Image source={{ uri: hospital.image }} style={styles.headerImage} />
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <Text style={styles.hospitalName}>{hospital.name}</Text>
              <View style={styles.ratingContainer}>
                {renderStars(hospital.rating)}
                <Text style={styles.ratingText}>({hospital.rating})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCardGlass}>
          <View style={styles.infoRow}>
            <Animated.View style={[styles.openBadge, { transform: [{ scale: pulseAnim }] }]}> 
              <LinearGradient colors={[ACCENT, '#6D28D9']} style={styles.openBadgeGradient}>
                <FontAwesome name="circle" size={12} color={hospital.isOpen ? '#fff' : '#f44336'} style={{ marginRight: 6 }} />
                <Text style={[styles.openBadgeText, { color: '#fff' }]}>{hospital.isOpen ? 'Open Now' : 'Closed'}</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={styles.distanceText}>{hospital.distance}</Text>
          </View>
          <Text style={styles.addressText}>{hospital.address}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <FontAwesome name="phone" size={20} color="#8B5CF6" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
            <FontAwesome name="map-marker" size={20} color="#2196F3" />
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleEmergency}>
            <FontAwesome name="ambulance" size={20} color="#f44336" />
            <Text style={styles.actionText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* Operating Hours */}
        <View style={styles.sectionGlass}>
          <Text style={styles.sectionHeader}>Operating Hours</Text>
          <View style={styles.hoursContainer}>
            <View style={styles.hourRow}><Text style={styles.hourDay}>Monday - Friday</Text><Text style={styles.hourTime}>24 Hours</Text></View>
            <View style={styles.hourRow}><Text style={styles.hourDay}>Saturday</Text><Text style={styles.hourTime}>24 Hours</Text></View>
            <View style={styles.hourRow}><Text style={styles.hourDay}>Sunday</Text><Text style={styles.hourTime}>24 Hours</Text></View>
          </View>
        </View>

        {/* Services */}
        <View style={styles.sectionGlass}>
          <Text style={styles.sectionHeader}>Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.servicesRow}>
              <View style={styles.serviceCard}><FontAwesome name="heartbeat" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Emergency Care</Text></View>
              <View style={styles.serviceCard}><FontAwesome name="stethoscope" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>General Medicine</Text></View>
              <View style={styles.serviceCard}><FontAwesome name="wheelchair" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Accessibility</Text></View>
              <View style={styles.serviceCard}><FontAwesome name="credit-card" size={22} color={ACCENT} /><Text style={styles.serviceCardText}>Insurance Accepted</Text></View>
            </View>
          </ScrollView>
        </View>

        {/* Emergency Contact Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
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
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  infoCardGlass: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 18,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    zIndex: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  openBadge: {
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  openBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  openBadgeText: {
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  distanceText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#888',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 10,
    marginBottom: 18,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    minWidth: 80,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DARK,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  hoursContainer: {
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
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  hourTime: {
    fontSize: 14,
    color: '#666',
  },
  servicesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  serviceText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerContentGlass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: GLASS_BG,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionGlass: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 18,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    zIndex: 10,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 8,
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
    backgroundColor: '#e53935',
    shadowColor: '#e53935',
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
  serviceCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
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
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
}); 