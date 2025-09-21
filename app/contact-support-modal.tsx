import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = '#3498db';
const PRIMARY = '#2c3e50';
const SUCCESS = '#27ae60';
const WARNING = '#f39c12';
const DANGER = '#e74c3c';
const LIGHT_GRAY = '#f8f9fa';
const DARK_GRAY = '#6c757d';

interface ContactMethod {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: () => void;
}

export default function ContactSupportModal() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactMethods: ContactMethod[] = [
    {
      id: 'email',
      title: 'Email Support',
      subtitle: 'Get detailed help via email',
      icon: 'envelope',
      color: ACCENT,
      action: () => handleEmailSupport()
    },
    {
      id: 'phone',
      title: 'Phone Support',
      subtitle: 'Call us for immediate assistance',
      icon: 'phone',
      color: SUCCESS,
      action: () => handlePhoneSupport()
    },
    {
      id: 'chat',
      title: 'Live Chat',
      subtitle: 'Chat with our support team',
      icon: 'comments',
      color: WARNING,
      action: () => handleLiveChat()
    },
    {
      id: 'ticket',
      title: 'Support Ticket',
      subtitle: 'Submit a detailed support request',
      icon: 'ticket',
      color: DANGER,
      action: () => handleSupportTicket()
    }
  ];

  const handleEmailSupport = () => {
    Alert.alert(
      'Email Support',
      'Send us an email at support@pharmalink.com and we\'ll get back to you within 24 hours.',
      [
        { text: 'Copy Email', onPress: () => console.log('Copy email to clipboard') },
        { text: 'Open Email App', onPress: () => console.log('Open email app') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePhoneSupport = () => {
    Alert.alert(
      'Phone Support',
      'Call our support team at +1 (555) 123-4567\n\nAvailable: Monday - Friday, 9 AM - 6 PM',
      [
        { text: 'Call Now', onPress: () => console.log('Make phone call') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleLiveChat = () => {
    Alert.alert(
      'Live Chat',
      'Our live chat is currently available. A support agent will be with you shortly.',
      [
        { text: 'Start Chat', onPress: () => console.log('Start live chat') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSupportTicket = () => {
    setSelectedMethod('ticket');
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message fields.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Success',
        'Your support ticket has been submitted successfully. We\'ll get back to you within 24 hours.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setSelectedMethod(null);
              setSubject('');
              setMessage('');
            }
          }
        ]
      );
    }, 2000);
  };

  const renderContactMethod = (method: ContactMethod) => (
    <TouchableOpacity
      key={method.id}
      style={styles.contactMethodCard}
      onPress={method.action}
      activeOpacity={0.7}
    >
      <View style={[styles.contactMethodIcon, { backgroundColor: `${method.color}15` }]}>
        <FontAwesome name={method.icon as any} size={24} color={method.color} />
      </View>
      <View style={styles.contactMethodContent}>
        <Text style={styles.contactMethodTitle}>{method.title}</Text>
        <Text style={styles.contactMethodSubtitle}>{method.subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color={DARK_GRAY} />
    </TouchableOpacity>
  );

  const renderSupportTicketForm = () => (
    <View style={styles.ticketForm}>
      <View style={styles.formHeader}>
        <TouchableOpacity
          onPress={() => setSelectedMethod(null)}
          style={styles.backButton}
        >
          <FontAwesome name="arrow-left" size={20} color={ACCENT} />
        </TouchableOpacity>
        <Text style={styles.formTitle}>Support Ticket</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Subject</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Brief description of your issue"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor={DARK_GRAY}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Message</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Please provide detailed information about your issue..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor={DARK_GRAY}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmitTicket}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={isSubmitting ? [DARK_GRAY, DARK_GRAY] : [ACCENT, '#2980b9']}
            style={styles.submitButtonGradient}
          >
            <FontAwesome 
              name={isSubmitting ? "spinner" : "paper-plane"} 
              size={18} 
              color="white" 
            />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {selectedMethod === 'ticket' ? (
        renderSupportTicketForm()
      ) : (
        <>
          {/* Header */}
          <LinearGradient
            colors={[ACCENT, '#2980b9']}
            style={styles.header}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBackButton}
            >
              <FontAwesome name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact Support</Text>
            <View style={styles.headerPlaceholder} />
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeIcon}>
                <FontAwesome name="headphones" size={32} color={ACCENT} />
              </View>
              <Text style={styles.welcomeTitle}>How can we help you?</Text>
              <Text style={styles.welcomeSubtitle}>
                Choose your preferred way to get in touch with our support team
              </Text>
            </View>

            <View style={styles.contactMethodsSection}>
              <Text style={styles.sectionTitle}>Contact Methods</Text>
              {contactMethods.map(renderContactMethod)}
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <FontAwesome name="clock-o" size={20} color={ACCENT} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Response Time</Text>
                  <Text style={styles.infoText}>We typically respond within 24 hours</Text>
                </View>
              </View>
              
              <View style={styles.infoCard}>
                <FontAwesome name="globe" size={20} color={SUCCESS} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Availability</Text>
                  <Text style={styles.infoText}>24/7 support for urgent issues</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </>
      )}
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: DARK_GRAY,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  contactMethodsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  contactMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  contactMethodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactMethodContent: {
    flex: 1,
  },
  contactMethodTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  contactMethodSubtitle: {
    fontSize: 14,
    color: DARK_GRAY,
    fontWeight: '500',
    lineHeight: 20,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: DARK_GRAY,
    fontWeight: '500',
  },
  ticketForm: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 40,
  },
  formContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
});
