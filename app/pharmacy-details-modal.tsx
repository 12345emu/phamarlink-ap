import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function PharmacyDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const pharmacy = {
    name: params.pharmacyName as string || 'Pharmacy',
    image: params.pharmacyImage as string || 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80',
    rating: parseFloat(params.pharmacyRating as string) || 4.5,
    distance: params.pharmacyDistance as string || '0.5 km',
    address: params.pharmacyAddress as string || '123 Main St, Montreal',
    isOpen: params.pharmacyOpen === 'true',
  };

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
    Alert.alert('Call Pharmacy', `Would call ${pharmacy.name}`);
  };

  const handleDirections = () => {
    Alert.alert('Directions', `Would open directions to ${pharmacy.name}`);
  };

  const handleOrder = () => {
    router.push('/(tabs)/orders');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerContainer}>
          <Image source={{ uri: pharmacy.image }} style={styles.headerImage} />
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
              <View style={styles.ratingContainer}>
                {renderStars(pharmacy.rating)}
                <Text style={styles.ratingText}>({pharmacy.rating})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: pharmacy.isOpen ? '#8B5CF6' : '#f44336' }]}>
              <FontAwesome name={pharmacy.isOpen ? 'clock-o' : 'times'} size={14} color="#fff" />
              <Text style={styles.statusText}>{pharmacy.isOpen ? 'Open Now' : 'Closed'}</Text>
            </View>
            <Text style={styles.distanceText}>{pharmacy.distance}</Text>
          </View>
          <Text style={styles.addressText}>{pharmacy.address}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <FontAwesome name="phone" size={20} color="#8B5CF6" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
            <FontAwesome name="map-marker" size={20} color="#2196F3" />
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleOrder}>
            <FontAwesome name="shopping-cart" size={20} color="#FF9800" />
            <Text style={styles.actionText}>Order</Text>
          </TouchableOpacity>
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <View style={styles.hoursContainer}>
            <View style={styles.hourRow}>
              <Text style={styles.dayText}>Monday - Friday</Text>
              <Text style={styles.timeText}>8:00 AM - 9:00 PM</Text>
            </View>
            <View style={styles.hourRow}>
              <Text style={styles.dayText}>Saturday</Text>
              <Text style={styles.timeText}>9:00 AM - 7:00 PM</Text>
            </View>
            <View style={styles.hourRow}>
              <Text style={styles.dayText}>Sunday</Text>
              <Text style={styles.timeText}>10:00 AM - 6:00 PM</Text>
            </View>
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesContainer}>
            <View style={styles.serviceItem}>
              <FontAwesome name="medkit" size={16} color="#8B5CF6" />
              <Text style={styles.serviceText}>Prescription Filling</Text>
            </View>
            <View style={styles.serviceItem}>
              <FontAwesome name="heartbeat" size={16} color="#8B5CF6" />
              <Text style={styles.serviceText}>Health Consultations</Text>
            </View>
            <View style={styles.serviceItem}>
              <FontAwesome name="truck" size={16} color="#8B5CF6" />
              <Text style={styles.serviceText}>Delivery Service</Text>
            </View>
            <View style={styles.serviceItem}>
              <FontAwesome name="credit-card" size={16} color="#8B5CF6" />
              <Text style={styles.serviceText}>Insurance Accepted</Text>
            </View>
          </View>
        </View>

        {/* Order Medicine Button */}
        <TouchableOpacity style={styles.orderButton} onPress={handleOrder}>
          <FontAwesome name="shopping-cart" size={18} color="#fff" />
          <Text style={styles.orderButtonText}>Order Medicine</Text>
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
    position: 'relative',
    height: 250,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pharmacyName: {
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
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  hoursContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeText: {
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
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 