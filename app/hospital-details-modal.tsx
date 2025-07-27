import React, { useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Platform, Animated, View, Text, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useAppointments } from '../context/AppointmentsContext';

const { width } = Dimensions.get('window');

const ACCENT = '#3498db';
const GLASS_BG = 'rgba(255,255,255,0.85)';
const DARK = '#333333';
const SHADOW = '#3498db';

export default function HospitalDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addAppointment } = useAppointments();

  const hospital = {
    name: params.hospitalName as string || 'Holy Family Hospital',
    image: params.hospitalImage as string || 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=400&q=80',
    rating: parseFloat(params.hospitalRating as string) || 4.5,
    distance: params.hospitalDistance as string || '2,1 km',
    address: params.hospitalAddress as string || '123 Main St, Accra',
    isOpen: params.hospitalOpen === 'true',
    phone: '+233-555-0123',
    email: 'info@holyfamilyhospital.com',
  };

  const services = [
    {
      id: 1,
      name: "Emergency Care",
      icon: "ambulance",
      description: "24/7 emergency medical services",
    },
    {
      id: 2,
      name: "General Medicine",
      icon: "stethoscope",
      description: "Primary care and consultations",
    },
    {
      id: 3,
      name: "Surgery",
      icon: "scissors",
      description: "Surgical procedures and operations",
    },
    {
      id: 4,
      name: "Pediatrics",
      icon: "child",
      description: "Specialized care for children",
    },
    {
      id: 5,
      name: "Cardiology",
      icon: "heartbeat",
      description: "Heart and cardiovascular care",
    },
    {
      id: 6,
      name: "Radiology",
      icon: "image",
      description: "X-ray and imaging services",
    },
  ];

  const doctors = [
    {
      id: 1,
      name: "Dr. Kwame Asante",
      specialty: "General Medicine",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      available: true,
    },
    {
      id: 2,
      name: "Dr. Sarah Mensah",
      specialty: "Pediatrics",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      available: true,
    },
    {
      id: 3,
      name: "Dr. Michael Osei",
      specialty: "Cardiology",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
      available: false,
    },
  ];

  const handleCall = () => {
    const phoneNumber = hospital.phone;
    if (phoneNumber) {
      Alert.alert(
        'Call Hospital',
        `Would you like to call ${hospital.name} at ${phoneNumber}?`,
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
      Alert.alert('Phone Number Unavailable', 'Phone number is not available for this hospital.');
    }
  };

  const handleDirections = () => {
    Alert.alert('Directions', `Would open directions to ${hospital.name}`);
  };

  const handleEmergency = () => {
    Alert.alert('Emergency', 'Call 911 for medical emergencies');
  };

  const handleChatWithDoctor = (doctor: any) => {
    if (doctor.available) {
      router.push('/(tabs)/chat');
    } else {
      Alert.alert('Doctor Unavailable', `${doctor.name} is currently not available for chat.`);
    }
  };

  const handleBookAppointment = () => {
    // Show available doctors and specialties
    Alert.alert(
      'Book Appointment',
      'Select a specialty to book an appointment:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'General Medicine',
          onPress: () => showAvailableSlots('General Medicine', 'Dr. Kwame Asante'),
        },
        {
          text: 'Pediatrics',
          onPress: () => showAvailableSlots('Pediatrics', 'Dr. Sarah Mensah'),
        },
        {
          text: 'Cardiology',
          onPress: () => showAvailableSlots('Cardiology', 'Dr. Michael Osei'),
        },
      ]
    );
  };

  const showAvailableSlots = (specialty: string, doctorName: string) => {
    const availableSlots = [
      { time: '9:00 AM', date: 'Tomorrow', available: true },
      { time: '10:30 AM', date: 'Tomorrow', available: true },
      { time: '2:00 PM', date: 'Tomorrow', available: true },
      { time: '9:00 AM', date: 'Day After Tomorrow', available: true },
      { time: '11:00 AM', date: 'Day After Tomorrow', available: true },
      { time: '3:30 PM', date: 'Day After Tomorrow', available: true },
    ];

    const slotOptions = availableSlots.map(slot => ({
      text: `${slot.time} - ${slot.date}`,
      onPress: () => confirmAppointment(specialty, doctorName, slot.time, slot.date),
    }));

    Alert.alert(
      `Available Slots - ${specialty}`,
      `Select a time slot with ${doctorName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...slotOptions,
      ]
    );
  };

  const confirmAppointment = (specialty: string, doctorName: string, time: string, date: string) => {
    Alert.alert(
      'Confirm Appointment',
      `Appointment Details:\n\nSpecialty: ${specialty}\nDoctor: ${doctorName}\nDate: ${date}\nTime: ${time}\n\nWould you like to confirm this appointment?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Appointment',
          onPress: () => {
            // Add the appointment to the context
            addAppointment({
              hospitalName: hospital.name,
              doctorName,
              specialty,
              date,
              time,
              status: 'upcoming',
              hospitalImage: hospital.image,
            });
            
            // Log the confirmed appointment
            console.log(`Appointment confirmed: ${specialty} with ${doctorName} on ${date} at ${time}`);
            
            Alert.alert(
              'Appointment Confirmed!',
              `Your appointment has been successfully booked!\n\nSpecialty: ${specialty}\nDoctor: ${doctorName}\nDate: ${date}\nTime: ${time}\n\nYou will receive a confirmation email shortly.`,
              [
                {
                  text: 'View My Appointments',
                  onPress: () => {
                    // Navigate to appointments page
                    console.log('User wants to view appointments');
                    router.push('/(tabs)/appointments');
                  },
                },
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('User acknowledged appointment confirmation');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleEmail = () => {
    const emailAddress = hospital.email;
    if (emailAddress) {
      Alert.alert(
        'Email Hospital',
        `Would you like to send an email to ${hospital.name} at ${emailAddress}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Email',
            onPress: () => {
              const subject = encodeURIComponent('Inquiry from PharmaLink App');
              const body = encodeURIComponent(`Hello ${hospital.name},\n\nI would like to inquire about your services and book an appointment.\n\nBest regards,\nPharmaLink User`);
              Linking.openURL(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
            },
          },
        ]
      );
    } else {
      Alert.alert('Email Unavailable', 'Email address is not available for this hospital.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Logo and Name */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <FontAwesome name="hospital-o" size={40} color="#fff" />
          </View>
          <Text style={styles.hospitalName}>{hospital.name}</Text>
          <View style={styles.locationInfo}>
            <FontAwesome name="map-marker" size={14} color="#e74c3c" />
            <Text style={styles.locationText}>Hospital • {hospital.distance}</Text>
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 5.5600,
              longitude: -0.2057,
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
                latitude: 5.5600,
                longitude: -0.2057,
              }}
              title={hospital.name}
              description="Hospital"
              pinColor="#e74c3c"
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
              <Text style={styles.quickActionText}>Call Hospital</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleEmail}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="envelope" size={24} color={ACCENT} />
              </View>
              <Text style={styles.quickActionText}>Send Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleBookAppointment}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="calendar" size={24} color={ACCENT} />
              </View>
              <Text style={styles.quickActionText}>Book Appointment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleEmergency}>
              <View style={styles.quickActionIcon}>
                <FontAwesome name="ambulance" size={24} color="#e74c3c" />
              </View>
              <Text style={styles.quickActionText}>Emergency</Text>
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

        {/* Chat with Doctors Section */}
        <View style={styles.doctorsSection}>
          <Text style={styles.sectionTitle}>Chat with Doctors</Text>
          <View style={styles.doctorsList}>
            {doctors.map((doctor) => (
              <TouchableOpacity 
                key={doctor.id} 
                style={styles.doctorItem}
                onPress={() => handleChatWithDoctor(doctor)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: doctor.avatar }} style={styles.doctorAvatar} />
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                </View>
                <View style={styles.doctorStatus}>
                  <View style={[styles.statusDot, { backgroundColor: doctor.available ? '#43e97b' : '#e74c3c' }]} />
                  <Text style={styles.statusText}>{doctor.available ? 'Available' : 'Busy'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  hospitalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 4,
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
  doctorsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  doctorsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  doctorStatus: {
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