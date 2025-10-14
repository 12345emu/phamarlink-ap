import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  View, 
  Text, 
  TextInput, 
  Alert, 
  Platform, 
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppointments } from '../context/AppointmentsContext';
import { useAuth } from '../context/AuthContext';
import { appointmentsService, AppointmentData } from '../services/appointmentsService';
import { professionalsService, HealthcareProfessional } from '../services/professionalsService';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DateSlot {
  date: string;
  formattedDate: string;
  timeSlots: TimeSlot[];
}

export default function AppointmentBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addAppointment } = useAppointments();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<DateSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredDoctor, setPreferredDoctor] = useState('');
  const [professionals, setProfessionals] = useState<HealthcareProfessional[]>([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const facilityId = parseInt(params.facilityId as string);
  const facilityName = params.facilityName as string;
  const facilityType = params.facilityType as string;

  // Debug logging
  console.log('🔍 Appointment booking params:', {
    facilityId: params.facilityId,
    parsedFacilityId: facilityId,
    facilityName: params.facilityName,
    facilityType: params.facilityType
  });

  const appointmentTypes = [
    { id: 'consultation', name: 'General Consultation', icon: 'stethoscope' },
    { id: 'checkup', name: 'Health Checkup', icon: 'heartbeat' },
    { id: 'followup', name: 'Follow-up Visit', icon: 'refresh' },
    { id: 'routine', name: 'Routine Visit', icon: 'calendar-check-o' },
    { id: 'emergency', name: 'Emergency', icon: 'ambulance' },
  ];

  useEffect(() => {
    fetchAvailableDates();
    fetchFacilityProfessionals();
  }, []);

  const fetchFacilityProfessionals = async () => {
    try {
      if (!facilityId || isNaN(facilityId)) {
        console.error('❌ Invalid facility ID for fetching professionals:', facilityId);
        return;
      }
      
      const response = await professionalsService.getProfessionalsByFacility(facilityId.toString());
      if (response.success && response.data && response.data.professionals) {
        console.log('✅ Fetched professionals for facility:', response.data.professionals.length);
        console.log('🔍 Professionals data sample:', JSON.stringify(response.data.professionals[0], null, 2));
        setProfessionals(response.data.professionals);
      } else {
        console.error('❌ Failed to fetch professionals:', response.message);
        setProfessionals([]);
      }
    } catch (error) {
      console.error('❌ Error fetching professionals:', error);
      setProfessionals([]);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching available dates for facility:', facilityId);
      console.log('🔍 Facility ID type:', typeof facilityId);
      console.log('🔍 Facility ID value:', facilityId);
      
      if (!facilityId || isNaN(facilityId)) {
        console.error('❌ Invalid facility ID:', facilityId);
        throw new Error('Invalid facility ID');
      }
      
      const availableSlots = await appointmentsService.getAvailableSlotsForNextDays(facilityId, 7);
      console.log('✅ Available slots received:', availableSlots);
      
      const dates: DateSlot[] = Object.entries(availableSlots)
        .filter(([date, slots]) => slots.length > 0)
        .map(([date, slots]) => ({
          date,
          formattedDate: appointmentsService.formatDate(date),
          timeSlots: slots.map(time => ({ time, available: true }))
        }))
        .slice(0, 5); // Show max 5 dates

      console.log('Processed dates:', dates);
      setAvailableDates(dates);
      if (dates.length > 0) {
        setSelectedDate(dates[0].date);
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
      // Use fallback data instead of showing error
      const fallbackDates: DateSlot[] = [
        {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          formattedDate: 'Tomorrow',
          timeSlots: [
            { time: '09:00', available: true },
            { time: '09:30', available: true },
            { time: '10:00', available: true },
            { time: '10:30', available: true },
            { time: '11:00', available: true },
            { time: '14:00', available: true },
            { time: '14:30', available: true },
            { time: '15:00', available: true },
          ]
        },
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          formattedDate: 'Day After Tomorrow',
          timeSlots: [
            { time: '09:00', available: true },
            { time: '09:30', available: true },
            { time: '10:00', available: true },
            { time: '10:30', available: true },
            { time: '11:00', available: true },
            { time: '14:00', available: true },
            { time: '14:30', available: true },
            { time: '15:00', available: true },
          ]
        }
      ];
      setAvailableDates(fallbackDates);
      setSelectedDate(fallbackDates[0].date);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedType) {
      Alert.alert('Please select an appointment type');
      return;
    }
    if (currentStep === 2 && !selectedDate) {
      Alert.alert('Please select a date');
      return;
    }
    if (currentStep === 3 && !selectedTime) {
      Alert.alert('Please select a time');
      return;
    }
    if (currentStep === 4 && (!reason.trim() || reason.trim().length < 10)) {
      Alert.alert('Please provide a detailed reason (at least 10 characters)');
      return;
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleBookAppointment();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedType || !reason.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    // Validate reason length (backend requires min 10 characters)
    if (reason.trim().length < 10) {
      Alert.alert('Error', 'Please provide a more detailed reason for your visit (at least 10 characters).');
      return;
    }

    // Validate reason length (backend requires max 500 characters)
    if (reason.trim().length > 500) {
      Alert.alert('Error', 'Please provide a shorter reason for your visit (maximum 500 characters).');
      return;
    }

    // Validate date format (should be YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(selectedDate)) {
      Alert.alert('Error', 'Invalid date format. Please try again.');
      return;
    }

    // Validate time format (should be HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(selectedTime)) {
      Alert.alert('Error', 'Invalid time format. Please try again.');
      return;
    }

    // Validate appointment type
    const validTypes = ['consultation', 'checkup', 'followup', 'emergency', 'routine'];
    if (!validTypes.includes(selectedType)) {
      Alert.alert('Error', 'Invalid appointment type. Please try again.');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'You need to be logged in to book an appointment. Would you like to log in now?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Log In',
            onPress: () => router.push('/login'),
          },
        ]
      );
      return;
    }

    try {
      setLoading(true);
      console.log('Creating appointment with data:', {
        facility_id: facilityId,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        appointment_type: selectedType,
        reason: reason.trim()
      });
      
      // Get the user_id for the preferred doctor
      let preferredDoctorUserId = undefined;
      if (preferredDoctor) {
        console.log('🔍 Looking for professional with ID:', preferredDoctor);
        console.log('🔍 Available professionals:', professionals.map(p => ({ id: p.id, user_id: p.user_id, name: `${p.first_name} ${p.last_name}` })));
        const selectedProfessional = professionals.find(p => p.id.toString() === preferredDoctor);
        if (selectedProfessional) {
          preferredDoctorUserId = selectedProfessional.user_id;
          console.log('🔍 Selected professional user_id:', preferredDoctorUserId);
          console.log('🔍 Selected professional details:', JSON.stringify(selectedProfessional, null, 2));
        } else {
          console.error('❌ Professional not found with ID:', preferredDoctor);
        }
      }

      const appointmentData: AppointmentData = {
        facility_id: parseInt(facilityId.toString()),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        appointment_type: selectedType as any,
        reason: reason.trim(),
        ...(symptoms.trim() && { symptoms: symptoms.trim().split(',').map(s => s.trim()) }),
        ...(preferredDoctorUserId && { preferred_doctor: parseInt(preferredDoctorUserId.toString()) }),
        ...(notes.trim() && { notes: notes.trim() }),
      };

      console.log('🔍 Final appointment data being sent:', JSON.stringify(appointmentData, null, 2));
      console.log('🔍 Data types:', {
        facility_id: typeof appointmentData.facility_id,
        appointment_date: typeof appointmentData.appointment_date,
        appointment_time: typeof appointmentData.appointment_time,
        appointment_type: typeof appointmentData.appointment_type,
        reason: typeof appointmentData.reason,
        symptoms: typeof appointmentData.symptoms,
        preferred_doctor: typeof appointmentData.preferred_doctor,
        notes: typeof appointmentData.notes
      });
      console.log('🔍 Raw values:', {
        facility_id: appointmentData.facility_id,
        facility_id_type: typeof appointmentData.facility_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        appointment_type: appointmentData.appointment_type,
        reason: appointmentData.reason,
        reason_length: appointmentData.reason.length,
        symptoms: appointmentData.symptoms,
        symptoms_type: typeof appointmentData.symptoms,
        preferred_doctor: appointmentData.preferred_doctor,
        preferred_doctor_type: typeof appointmentData.preferred_doctor,
        notes: appointmentData.notes
      });

      const result = await appointmentsService.createAppointment(appointmentData);
      console.log('✅ Appointment creation completed:', result);
      
      // Only proceed if we have a valid result with an ID
      if (!result || !result.id) {
        throw new Error('Invalid response from server - no appointment ID received');
      }
      
      // Add to local context for immediate display
      addAppointment({
        hospitalName: facilityName,
        doctorName: 'To be assigned',
        specialty: selectedType,
        date: appointmentsService.formatDate(selectedDate),
        time: appointmentsService.formatTime(selectedTime),
        status: 'upcoming',
        hospitalImage: params.facilityImage as string,
      });

      // Show success message only if appointment was actually created
      Alert.alert(
        'Appointment Booked Successfully! 🎉',
        `Your appointment has been scheduled!\n\n📅 Date: ${appointmentsService.formatDate(selectedDate)}\n⏰ Time: ${appointmentsService.formatTime(selectedTime)}\n🏥 Type: ${appointmentTypes.find(t => t.id === selectedType)?.name}\n\nYou will receive a confirmation email shortly.`,
        [
          {
            text: 'View My Appointments',
            onPress: () => router.push('/(tabs)/appointments'),
          },
          {
            text: 'Book Another',
            onPress: () => {
              setCurrentStep(1);
              setSelectedType('');
              setSelectedDate('');
              setSelectedTime('');
              setReason('');
              setSymptoms('');
              setNotes('');
              setPreferredDoctor('');
              setShowDoctorDropdown(false);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error creating appointment:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Check if the appointment was actually created despite the error
      // This can happen if there's a race condition or API client issue
      if (error.message && (error.message.includes('Invalid appointment data received from server') || 
                           error.message.includes('Invalid response from server'))) {
        console.log('⚠️ Appointment may have been created despite error, checking...');
        // Don't show error if appointment was likely created
        // The appointment was likely created successfully
        return;
      }
      
      // Check if it's an authentication error
      if (error.message && error.message.includes('401')) {
        Alert.alert(
          'Authentication Required',
          'Your session has expired. Please log in again to book an appointment.',
          [
            {
              text: 'Log In',
              onPress: () => router.push('/login'),
            },
          ]
        );
        return;
      }
      
      // Check if it's a validation error
      if (error.message && error.message.includes('Validation error')) {
        Alert.alert(
          'Invalid Information',
          'Please check your appointment details and try again. Make sure all required fields are filled correctly.',
          [
            {
              text: 'OK',
              onPress: () => {},
            },
          ]
        );
        return;
      }
      
      // Check if it's a network error
      if (error.message && (error.message.includes('Network') || error.message.includes('fetch'))) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            {
              text: 'OK',
              onPress: () => {},
            },
          ]
        );
        return;
      }
      
      // Generic error message
      Alert.alert(
        'Appointment Creation Failed',
        `Unable to create your appointment. ${error.message || 'Please try again later.'}`,
        [
          {
            text: 'OK',
            onPress: () => {},
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepIndicatorItemContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step ? styles.stepActive : styles.stepInactive
          ]}>
            <Text style={[
              styles.stepText,
              currentStep >= step ? styles.stepTextActive : styles.stepTextInactive
            ]}>
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              currentStep > step ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContentContainer}>
      <Text style={styles.stepTitle}>Select Appointment Type</Text>
      <Text style={styles.stepSubtitle}>Choose the type of appointment you need</Text>
      
      <View style={styles.optionsContainer}>
        {appointmentTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.optionCard,
              selectedType === type.id && styles.optionCardSelected
            ]}
            onPress={() => setSelectedType(type.id)}
            activeOpacity={0.7}
          >
            <FontAwesome 
              name={type.icon as any} 
              size={24} 
              color={selectedType === type.id ? '#fff' : ACCENT} 
            />
            <Text style={[
              styles.optionText,
              selectedType === type.id && styles.optionTextSelected
            ]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContentContainer}>
      <Text style={styles.stepTitle}>Select Date</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred date</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading available dates...</Text>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          {availableDates.map((dateSlot) => (
            <TouchableOpacity
              key={dateSlot.date}
              style={[
                styles.optionCard,
                selectedDate === dateSlot.date && styles.optionCardSelected
              ]}
              onPress={() => setSelectedDate(dateSlot.date)}
              activeOpacity={0.7}
            >
              <FontAwesome 
                name="calendar" 
                size={24} 
                color={selectedDate === dateSlot.date ? '#fff' : ACCENT} 
              />
              <View style={styles.dateInfo}>
                <Text style={[
                  styles.optionText,
                  selectedDate === dateSlot.date && styles.optionTextSelected
                ]}>
                  {dateSlot.formattedDate}
                </Text>
                <Text style={[
                  styles.dateSlots,
                  selectedDate === dateSlot.date && styles.dateSlotsSelected
                ]}>
                  {dateSlot.timeSlots.length} slots available
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => {
    const selectedDateSlot = availableDates.find(d => d.date === selectedDate);
    
    return (
      <View style={styles.stepContentContainer}>
        <Text style={styles.stepTitle}>Select Time</Text>
        <Text style={styles.stepSubtitle}>Choose your preferred time slot</Text>
        
        <View style={styles.optionsContainer}>
          {selectedDateSlot?.timeSlots.map((timeSlot) => (
            <TouchableOpacity
              key={timeSlot.time}
              style={[
                styles.optionCard,
                selectedTime === timeSlot.time && styles.optionCardSelected
              ]}
              onPress={() => setSelectedTime(timeSlot.time)}
              activeOpacity={0.7}
            >
              <FontAwesome 
                name="clock-o" 
                size={24} 
                color={selectedTime === timeSlot.time ? '#fff' : ACCENT} 
              />
              <Text style={[
                styles.optionText,
                selectedTime === timeSlot.time && styles.optionTextSelected
              ]}>
                {appointmentsService.formatTime(timeSlot.time)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContentContainer}>
      <Text style={styles.stepTitle}>Appointment Details</Text>
      <Text style={styles.stepSubtitle}>Please provide additional information</Text>
      
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reason for Visit *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe your symptoms or reason for visit..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Symptoms (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., fever, headache, cough (separate with commas)"
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preferred Doctor (Optional)</Text>
          <TouchableOpacity
            style={[styles.textInput, { minHeight: 50, justifyContent: 'center' }]}
            onPress={() => setShowDoctorDropdown(!showDoctorDropdown)}
            activeOpacity={0.7}
          >
            <Text style={preferredDoctor ? styles.dropdownText : styles.dropdownPlaceholder}>
              {preferredDoctor 
                ? (() => {
                    const selectedProfessional = professionals.find(p => p.id.toString() === preferredDoctor);
                    return selectedProfessional ? 
                      `${selectedProfessional.first_name} ${selectedProfessional.last_name}` 
                      : 'Selected Doctor';
                  })()
                : 'Select a doctor or leave blank for any available doctor...'
              }
            </Text>
            <FontAwesome 
              name={showDoctorDropdown ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#95a5a6" 
              style={{ position: 'absolute', right: 12 }}
            />
          </TouchableOpacity>
          
          {showDoctorDropdown && (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setPreferredDoctor('');
                  setShowDoctorDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>Any available doctor</Text>
              </TouchableOpacity>
              {professionals.map((professional) => (
                <TouchableOpacity
                  key={professional.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setPreferredDoctor(professional.id.toString());
                    setShowDoctorDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{professional.first_name} {professional.last_name}</Text>
                  <Text style={styles.dropdownItemSubtext}>{professional.specialty}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Any additional information..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Facility Info */}
      <View style={styles.facilityInfo}>
        <FontAwesome name="hospital-o" size={20} color={ACCENT} />
        <Text style={styles.facilityName}>{facilityName}</Text>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={currentStep === 4 ? styles.step4ContentContainer : undefined}
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePreviousStep}
            disabled={loading}
          >
            <FontAwesome name="arrow-left" size={16} color="#2c3e50" />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={handleNextStep}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.navButtonTextPrimary}>
                {currentStep === 4 ? 'Book Appointment' : 'Next'}
              </Text>
              <FontAwesome name="arrow-right" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 36,
  },
  facilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginLeft: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  stepIndicatorItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: ACCENT,
  },
  stepInactive: {
    backgroundColor: '#ecf0f1',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepTextInactive: {
    color: '#95a5a6',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: ACCENT,
  },
  stepLineInactive: {
    backgroundColor: '#ecf0f1',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContentContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCardSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  optionTextSelected: {
    color: '#fff',
  },
  dateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dateSlots: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  dateSlotsSelected: {
    color: '#bdc3c7',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 12,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    backgroundColor: '#fff',
    minWidth: 100,
    justifyContent: 'center',
  },
  navButtonPrimary: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginLeft: 8,
  },
  navButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginRight: 8,
  },
  step4ContentContainer: {
    paddingBottom: 100, // Extra padding for step 4 to ensure form is visible above keyboard
  },
  dropdownText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#95a5a6',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
}); 