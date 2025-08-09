import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, Dimensions, Alert, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';

interface TrackingStep {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  icon: string;
}

interface DeliveryLocation {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
}

export default function OrderTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentStep, setCurrentStep] = useState(2); // Current step index
  const [estimatedTime, setEstimatedTime] = useState('2:30 PM');
  const [driverInfo, setDriverInfo] = useState({
    name: 'Kwame Mensah',
    phone: '+233-555-0123',
    vehicle: 'Toyota Corolla - GX-1234-A'
  });

  // Sample tracking data based on order ID
  const getTrackingSteps = (orderId: string): TrackingStep[] => {
    const baseSteps: TrackingStep[] = [
      {
        id: '1',
        title: 'Order Placed',
        description: 'Your order has been successfully placed',
        timestamp: '10:30 AM',
        status: 'completed',
        icon: 'check-circle'
      },
      {
        id: '2',
        title: 'Order Confirmed',
        description: 'Pharmacy has confirmed your order',
        timestamp: '10:45 AM',
        status: 'completed',
        icon: 'check-circle'
      },
      {
        id: '3',
        title: 'Preparing Order',
        description: 'Your medicines are being prepared',
        timestamp: '11:00 AM',
        status: 'completed',
        icon: 'check-circle'
      },
      {
        id: '4',
        title: 'Out for Delivery',
        description: 'Your order is on its way to you',
        timestamp: '12:15 PM',
        status: 'current',
        icon: 'truck'
      },
      {
        id: '5',
        title: 'Delivered',
        description: 'Your order has been delivered',
        timestamp: estimatedTime,
        status: 'pending',
        icon: 'home'
      }
    ];

    // Customize based on order status
    if (orderId === 'ORD-2024-001') {
      // Delivered order
      return baseSteps.map((step, index) => ({
        ...step,
        status: index < 5 ? 'completed' : 'pending'
      }));
    } else if (orderId === 'ORD-2024-002') {
      // Out for delivery
      return baseSteps.map((step, index) => ({
        ...step,
        status: index < 4 ? 'completed' : index === 4 ? 'current' : 'pending'
      }));
    } else {
      // Confirmed order
      return baseSteps.map((step, index) => ({
        ...step,
        status: index < 3 ? 'completed' : index === 3 ? 'current' : 'pending'
      }));
    }
  };

  const getDeliveryLocations = (orderId: string): DeliveryLocation[] => {
    const baseLocations = [
      {
        latitude: 5.5600,
        longitude: -0.2057,
        title: 'Alpha Pharmacy',
        description: 'Pickup location'
      },
      {
        latitude: 5.6037,
        longitude: -0.1870,
        title: 'Your Location',
        description: 'Delivery address'
      }
    ];

    if (orderId === 'ORD-2024-002') {
      // Add current driver location for out-for-delivery orders
      return [
        ...baseLocations,
        {
          latitude: 5.5800,
          longitude: -0.1950,
          title: 'Driver Location',
          description: 'Currently here'
        }
      ];
    }

    return baseLocations;
  };

  const trackingSteps = getTrackingSteps(params.orderId as string);
  const deliveryLocations = getDeliveryLocations(params.orderId as string);

  const handleCallDriver = () => {
    Alert.alert(
      'Call Driver',
      `Call ${driverInfo.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Alert.alert('Calling...', `Would call ${driverInfo.phone}`) }
      ]
    );
  };

  const handleMessageDriver = () => {
    Alert.alert('Message Driver', `Would open chat with ${driverInfo.name}`);
  };

  const getStepIconColor = (status: string) => {
    switch (status) {
      case 'completed':
        return SUCCESS;
      case 'current':
        return ACCENT;
      case 'pending':
        return '#95a5a6';
      default:
        return '#95a5a6';
    }
  };

  const getStepIconBackground = (status: string) => {
    switch (status) {
      case 'completed':
        return 'rgba(67, 233, 123, 0.1)';
      case 'current':
        return 'rgba(52, 152, 219, 0.1)';
      case 'pending':
        return '#f8f9fa';
      default:
        return '#f8f9fa';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* Swipe to go back area */}
        <TouchableOpacity 
          style={styles.swipeArea}
          onPress={() => router.push('/(tabs)/orders' as any)}
          activeOpacity={0.1}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.push('/(tabs)/orders' as any)} 
            activeOpacity={0.7}
          >
            <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={styles.headerRight}>
            <FontAwesome name="map-marker" size={20} color={ACCENT} />
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.orderInfoCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{params.orderId}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {trackingSteps.find(step => step.status === 'current')?.title || 'Processing'}
              </Text>
            </View>
          </View>
          <Text style={styles.estimatedTime}>Estimated Delivery: {estimatedTime}</Text>
        </View>

        {/* Driver Info */}
        {trackingSteps.find(step => step.status === 'current')?.title === 'Out for Delivery' && (
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <FontAwesome name="user" size={20} color={ACCENT} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverInfo.name}</Text>
                <Text style={styles.driverVehicle}>{driverInfo.vehicle}</Text>
              </View>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver} activeOpacity={0.7}>
                <FontAwesome name="phone" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessageDriver} activeOpacity={0.7}>
                <FontAwesome name="comment" size={16} color={ACCENT} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tracking Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Delivery Progress</Text>
          {trackingSteps.map((step, index) => (
            <View key={step.id} style={styles.timelineItem}>
              <View style={styles.timelineIcon}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: getStepIconBackground(step.status) }
                ]}>
                  <FontAwesome 
                    name={step.icon as any} 
                    size={16} 
                    color={getStepIconColor(step.status)} 
                  />
                </View>
                {index < trackingSteps.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    { backgroundColor: step.status === 'completed' ? SUCCESS : '#ecf0f1' }
                  ]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepTime}>{step.timestamp}</Text>
                </View>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Map */}
        <View style={styles.mapCard}>
          <Text style={styles.mapTitle}>Delivery Route</Text>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 5.5800,
              longitude: -0.1950,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapType="standard"
            provider="google"
          >
            {deliveryLocations.map((location, index) => (
              <Marker
                key={index}
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={location.title}
                description={location.description}
                pinColor={location.title === 'Driver Location' ? ACCENT : 
                         location.title === 'Your Location' ? SUCCESS : '#95a5a6'}
              />
            ))}
          </MapView>
          
          {/* Open in Google Maps Button */}
          <TouchableOpacity 
            style={styles.openMapsButton}
            onPress={() => {
              const pharmacyLocation = deliveryLocations.find(loc => loc.title === 'Alpha Pharmacy');
              const userLocation = deliveryLocations.find(loc => loc.title === 'Your Location');
              
              if (pharmacyLocation && userLocation) {
                const url = `https://www.google.com/maps/dir/${pharmacyLocation.latitude},${pharmacyLocation.longitude}/${userLocation.latitude},${userLocation.longitude}`;
                Linking.openURL(url);
              }
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="external-link" size={16} color="#fff" />
            <Text style={styles.openMapsButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  estimatedTime: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  driverCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    backgroundColor: SUCCESS,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIcon: {
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    height: 30,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  stepTime: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  stepDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  mapCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  map: {
    height: 200,
    borderRadius: 12,
  },
  openMapsButton: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  openMapsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  swipeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 10,
  },
}); 