import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Platform, Animated, View, Text, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useAppointments } from '../context/AppointmentsContext';
import { facilitiesService, Facility } from '../services/facilitiesService';
import { professionalsService, HealthcareProfessional } from '../services/professionalsService';

const { width } = Dimensions.get('window');

const ACCENT = '#3498db';
const GLASS_BG = 'rgba(255,255,255,0.85)';
const DARK = '#333333';
const SHADOW = '#3498db';

export default function HospitalDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addAppointment } = useAppointments();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [facilityProfessionals, setFacilityProfessionals] = useState<HealthcareProfessional[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);

  // Fetch facility data and professionals from API
  useEffect(() => {
    const fetchFacilityData = async () => {
      try {
        const facilityId = params.id as string;
        if (facilityId) {
          console.log('🔍 Fetching hospital data for ID:', facilityId);
          
          // Fetch facility data
          const response = await facilitiesService.getFacilityById(facilityId);
          if (response.success && response.data) {
            console.log('✅ Hospital data fetched:', response.data);
            setFacility(response.data);
          } else {
            console.log('❌ Failed to fetch hospital data:', response.message);
          }

          // Fetch facility professionals
          setProfessionalsLoading(true);
          const professionalsResponse = await professionalsService.getProfessionalsByFacility(facilityId, 10);
          if (professionalsResponse.success && professionalsResponse.data) {
            console.log('✅ Hospital professionals fetched:', professionalsResponse.data);
            setFacilityProfessionals(professionalsResponse.data);
          } else {
            console.log('❌ Failed to fetch hospital professionals:', professionalsResponse.message);
          }
        } else {
          console.log('❌ No hospital ID provided in params');
        }
      } catch (error) {
        console.error('Error fetching facility data:', error);
      } finally {
        setLoading(false);
        setProfessionalsLoading(false);
      }
    };

    fetchFacilityData();
  }, [params.id]);

  // Fallback facility data if API fails
  const facilityData = {
    name: facility?.name || params.hospitalName as string || 'Holy Family Hospital',
    image: params.hospitalImage as string || 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=400&q=80',
    rating: facility?.rating || parseFloat(params.hospitalRating as string) || 4.5,
    distance: params.hospitalDistance as string || '2,1 km',
    address: facility?.address?.street || params.hospitalAddress as string || '123 Hospital Road, Adabraka',
    isOpen: facility?.isOpen || params.hospitalOpen === 'true',
    phone: facility?.phone || params.phone as string || '+233-555-0123',
    email: facility?.email || 'info@holyfamilyhospital.com',
    type: facility?.type || 'hospital'
  };

  // Get facility type display name
  const getFacilityTypeDisplayName = (type: string) => {
    switch (type) {
      case 'clinic': return 'Clinic';
      case 'hospital': return 'Hospital';
      case 'pharmacy': return 'Pharmacy';
      default: return 'Healthcare Facility';
    }
  };

  // Get facility icon
  const getFacilityIcon = (type: string) => {
    switch (type) {
      case 'clinic': return 'stethoscope';
      case 'hospital': return 'hospital-o';
      case 'pharmacy': return 'medkit';
      default: return 'hospital-o';
    }
  };

  // Transform database services to display format
  const getServicesFromDatabase = () => {
    if (!facility?.services || facility.services.length === 0) {
      return [
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
    }

    // Map service names to icons
    const serviceIconMap: { [key: string]: string } = {
      'Emergency Care': 'ambulance',
      'General Medicine': 'stethoscope',
      'Surgery': 'scissors',
      'Pediatrics': 'child',
      'Cardiology': 'heartbeat',
      'Radiology': 'image',
      'Maternity': 'baby',
      'Neurology': 'brain',
      'General Consultation': 'stethoscope',
      'Specialized Care': 'user-md',
      'Laboratory': 'flask',
      'X-Ray': 'image',
      'Ultrasound': 'image',
      'Prescription Filling': 'medkit',
      'Health Consultations': 'stethoscope',
      'Delivery Service': 'truck',
      'Insurance Accepted': 'credit-card',
      'Vaccinations': 'syringe',
      'Health Monitoring': 'heartbeat',
      'Over-the-counter': 'pills',
    };

    return facility.services.map((service, index) => ({
      id: index + 1,
      name: service,
      icon: serviceIconMap[service] || 'medkit',
      description: `${service} services available`,
    }));
  };

  const services = getServicesFromDatabase();

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
    const phoneNumber = facility?.phone || facilityData.phone;
    if (phoneNumber) {
      Alert.alert(
        `Call ${getFacilityTypeDisplayName(facilityData.type)}`,
        `Would you like to call ${facilityData.name} at ${phoneNumber}?`,
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
      Alert.alert('Phone Number Unavailable', `Phone number is not available for this ${getFacilityTypeDisplayName(facilityData.type).toLowerCase()}.`);
    }
  };

  const handleDirections = () => {
    // Navigate to the hospital map modal with hospital data
    router.push({
      pathname: '/hospital-map-modal',
      params: {
        hospitalName: facilityData.name,
        hospitalAddress: facility?.address?.street || facilityData.address,
        hospitalPhone: facility?.phone || facilityData.phone,
        hospitalRating: facilityData.rating.toString(),
        hospitalDistance: facilityData.distance,
        latitude: facility?.coordinates?.latitude?.toString() || '5.5600',
        longitude: facility?.coordinates?.longitude?.toString() || '-0.2057',
      }
    });
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Services',
      'For medical emergencies, please call the emergency services:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call Emergency (112)',
          onPress: () => {
            Linking.openURL('tel:112').catch((err) => {
              Alert.alert('Error', 'Could not make the call. Please try again.');
            });
          },
        },
        {
          text: 'Call Hospital',
          onPress: () => {
            const phoneNumber = facility?.phone || facilityData.phone;
            if (phoneNumber) {
              Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
                Alert.alert('Error', 'Could not make the call. Please try again.');
              });
            } else {
              Alert.alert('Phone Number Unavailable', 'Hospital phone number is not available.');
            }
          },
        },
      ]
    );
  };

  const handleChatWithDoctor = (professional: any) => {
    if (professional.is_available) {
      // Navigate to chat page with professional information
      router.push({
        pathname: '/(tabs)/chat',
        params: {
          professionalId: professional.id.toString(),
          professionalName: professional.full_name,
          professionalRole: professional.specialty.toLowerCase().includes('pharmacist') ? 'pharmacist' : 'doctor',
          facilityName: facility?.name || facilityData.name,
          professionalSpecialty: professional.specialty,
          professionalAvatar: professionalsService.getProfessionalIcon(professional.specialty),
          professionalRating: professional.rating.toString(),
          professionalExperience: professional.experience_years.toString()
        }
      });
    } else {
      Alert.alert('Doctor Unavailable', `${professional.full_name} is currently not available for chat.`);
    }
  };

  const handleBookAppointment = () => {
    // Navigate to the appointment booking page
    router.push({
      pathname: '/appointment-booking-modal',
      params: {
        facilityId: params.id as string,
        facilityName: facilityData.name,
        facilityType: getFacilityTypeDisplayName(facilityData.type),
        facilityImage: facilityData.image,
      }
    });
  };

  const handleEmail = () => {
    const emailAddress = facility?.email || facilityData.email;
    if (emailAddress) {
      Alert.alert(
        `Email ${getFacilityTypeDisplayName(facilityData.type)}`,
        `Would you like to send an email to ${facilityData.name} at ${emailAddress}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Email',
            onPress: () => {
              const subject = encodeURIComponent('Inquiry from PharmaLink App');
              const body = encodeURIComponent(`Hello ${facilityData.name},\n\nI would like to inquire about your services and book an appointment.\n\nBest regards,\nPharmaLink User`);
              Linking.openURL(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
            },
          },
        ]
      );
    } else {
      Alert.alert('Email Unavailable', `Email address is not available for this ${getFacilityTypeDisplayName(facilityData.type).toLowerCase()}.`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading facility details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Logo and Name */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <FontAwesome name={getFacilityIcon(facilityData.type)} size={40} color="#fff" />
          </View>
              <Text style={styles.hospitalName}>{facilityData.name}</Text>
          <View style={styles.locationInfo}>
            <FontAwesome name="map-marker" size={14} color="#e74c3c" />
            <Text style={styles.locationText}>{getFacilityTypeDisplayName(facilityData.type)} • {facilityData.distance}</Text>
          </View>
          {(facility?.phone || facility?.email) && (
            <View style={styles.contactInfo}>
              {facility?.phone && (
                <Text style={styles.contactDetail}>📞 {facility.phone}</Text>
              )}
              {facility?.email && (
                <Text style={styles.contactDetail}>✉️ {facility.email}</Text>
              )}
            </View>
          )}
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: facility?.coordinates?.latitude || 5.5600,
              longitude: facility?.coordinates?.longitude || -0.2057,
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
                latitude: facility?.coordinates?.latitude || 5.5600,
                longitude: facility?.coordinates?.longitude || -0.2057,
              }}
              title={facilityData.name}
              description={getFacilityTypeDisplayName(facilityData.type)}
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
        <View style={styles.professionalsSection}>
          <Text style={styles.sectionTitle}>Chat with Doctors</Text>
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
                    onPress={() => handleChatWithDoctor(professional)}
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
              <Text style={styles.noProfessionalsText}>No doctors available at this {getFacilityTypeDisplayName(facilityData.type).toLowerCase()}.</Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  contactInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  contactDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
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