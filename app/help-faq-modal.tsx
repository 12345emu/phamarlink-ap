import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isExpanded: boolean;
}

interface HelpFAQModalProps {
  visible: boolean;
  onClose: () => void;
}

const FAQ_CATEGORIES = [
  'Getting Started',
  'Account & Profile',
  'Appointments',
  'Patients',
  'Prescriptions',
  'Billing & Payments',
  'Technical Support',
  'Privacy & Security',
];

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    question: 'How do I get started with PharmaLink?',
    answer: 'To get started, create your account, complete your profile with your medical credentials, and verify your identity. Once verified, you can start managing appointments, patients, and prescriptions.',
    category: 'Getting Started',
    isExpanded: false,
  },
  {
    id: '2',
    question: 'What documents do I need for verification?',
    answer: 'You need your medical license, DEA number (if applicable), NPI number, and a valid government-issued ID. We may also require additional documentation based on your specialty.',
    category: 'Getting Started',
    isExpanded: false,
  },
  {
    id: '3',
    question: 'How long does verification take?',
    answer: 'Verification typically takes 1-3 business days. We review all documents carefully to ensure compliance with medical regulations.',
    category: 'Getting Started',
    isExpanded: false,
  },

  // Account & Profile
  {
    id: '4',
    question: 'How do I update my profile information?',
    answer: 'Go to your profile page and tap "Edit Profile". You can update your personal information, medical credentials, specializations, and hospital affiliations.',
    category: 'Account & Profile',
    isExpanded: false,
  },
  {
    id: '5',
    question: 'How do I change my password?',
    answer: 'In your profile settings, tap "Change Password". Enter your current password and create a new secure password. You\'ll need to log in again on all devices.',
    category: 'Account & Profile',
    isExpanded: false,
  },
  {
    id: '6',
    question: 'How do I update my profile photo?',
    answer: 'Go to your profile page, tap the camera icon on your profile photo, and select a new image from your device. The image will be automatically resized and optimized.',
    category: 'Account & Profile',
    isExpanded: false,
  },

  // Appointments
  {
    id: '7',
    question: 'How do I schedule an appointment?',
    answer: 'Go to the Appointments tab, tap the "+" button, and fill in the appointment details including patient, date, time, and reason for visit.',
    category: 'Appointments',
    isExpanded: false,
  },
  {
    id: '8',
    question: 'How do I reschedule an appointment?',
    answer: 'Find the appointment in your schedule, tap on it, and select "Reschedule". Choose a new date and time that works for both you and the patient.',
    category: 'Appointments',
    isExpanded: false,
  },
  {
    id: '9',
    question: 'Can patients book appointments directly?',
    answer: 'Yes, patients can book appointments through the patient portal if you have enabled online booking in your availability settings.',
    category: 'Appointments',
    isExpanded: false,
  },

  // Patients
  {
    id: '10',
    question: 'How do I add a new patient?',
    answer: 'Go to the Patients tab, tap "Add Patient", and enter their information including name, date of birth, contact details, and medical history.',
    category: 'Patients',
    isExpanded: false,
  },
  {
    id: '11',
    question: 'How do I view patient medical history?',
    answer: 'Tap on any patient in your patient list to view their complete medical history, previous appointments, prescriptions, and notes.',
    category: 'Patients',
    isExpanded: false,
  },
  {
    id: '12',
    question: 'Can I import patient data from other systems?',
    answer: 'Yes, we support importing patient data from most EHR systems. Contact our support team for assistance with data migration.',
    category: 'Patients',
    isExpanded: false,
  },

  // Prescriptions
  {
    id: '13',
    question: 'How do I write a prescription?',
    answer: 'Select a patient, tap "New Prescription", choose the medication, dosage, and instructions. The prescription will be sent electronically to the pharmacy.',
    category: 'Prescriptions',
    isExpanded: false,
  },
  {
    id: '14',
    question: 'Can I prescribe controlled substances?',
    answer: 'Yes, but you must have a valid DEA number and the patient must be in your system. All controlled substance prescriptions are tracked and reported as required by law.',
    category: 'Prescriptions',
    isExpanded: false,
  },
  {
    id: '15',
    question: 'How do I check prescription history?',
    answer: 'Go to the patient\'s profile and tap "Prescription History" to view all previous prescriptions, refills, and medication adherence.',
    category: 'Prescriptions',
    isExpanded: false,
  },

  // Billing & Payments
  {
    id: '16',
    question: 'How do I set up billing?',
    answer: 'Go to Settings > Billing to add your payment information, set consultation fees, and configure billing preferences.',
    category: 'Billing & Payments',
    isExpanded: false,
  },
  {
    id: '17',
    question: 'How do I process payments?',
    answer: 'Payments are processed automatically through our secure payment system. You can view payment history and generate invoices from the billing section.',
    category: 'Billing & Payments',
    isExpanded: false,
  },
  {
    id: '18',
    question: 'What are the platform fees?',
    answer: 'We charge a small transaction fee for each consultation. The exact fee structure is available in your billing settings and varies based on your subscription plan.',
    category: 'Billing & Payments',
    isExpanded: false,
  },

  // Technical Support
  {
    id: '19',
    question: 'The app is running slowly. What should I do?',
    answer: 'Try closing and reopening the app, check your internet connection, or restart your device. If the problem persists, contact our technical support team.',
    category: 'Technical Support',
    isExpanded: false,
  },
  {
    id: '20',
    question: 'I\'m having trouble logging in. What should I do?',
    answer: 'Check your internet connection, ensure you\'re using the correct email and password, or try resetting your password. Contact support if the issue continues.',
    category: 'Technical Support',
    isExpanded: false,
  },
  {
    id: '21',
    question: 'How do I update the app?',
    answer: 'The app updates automatically on most devices. You can also check for updates in your device\'s app store.',
    category: 'Technical Support',
    isExpanded: false,
  },

  // Privacy & Security
  {
    id: '22',
    question: 'How is my data protected?',
    answer: 'We use end-to-end encryption, HIPAA-compliant security measures, and regular security audits to protect your data. All data is stored in secure, certified data centers.',
    category: 'Privacy & Security',
    isExpanded: false,
  },
  {
    id: '23',
    question: 'Can I export my data?',
    answer: 'Yes, you can export your data at any time. Go to Settings > Data Export to download your information in a standard format.',
    category: 'Privacy & Security',
    isExpanded: false,
  },
  {
    id: '24',
    question: 'How do I delete my account?',
    answer: 'Contact our support team to request account deletion. We\'ll guide you through the process and ensure all data is properly removed according to regulations.',
    category: 'Privacy & Security',
    isExpanded: false,
  },
];

export default function HelpFAQModal({ visible, onClose }: HelpFAQModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [faqItems, setFaqItems] = useState<FAQItem[]>(FAQ_DATA);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'Medium',
  });

  const categories = ['All', ...FAQ_CATEGORIES];

  // Filter FAQ items based on search and category
  const filteredFAQItems = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggleFAQ = (id: string) => {
    setFaqItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const handleContactSupport = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // TODO: Send support request to backend
      console.log('🔍 HelpFAQModal - Sending support request:', contactForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Your support request has been sent. We\'ll get back to you within 24 hours.', [
        {
          text: 'OK',
          onPress: () => {
            setContactForm({ subject: '', message: '', priority: 'Medium' });
          }
        }
      ]);
    } catch (error) {
      console.error('❌ HelpFAQModal - Error sending support request:', error);
      Alert.alert('Error', 'Failed to send support request. Please try again.');
    }
  };

  const handleCallSupport = () => {
    const phoneNumber = '+1-800-PHARMALINK';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmailSupport = () => {
    const email = 'support@pharmalink.com';
    const subject = 'Support Request';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  const renderFAQItem = (item: FAQItem) => (
    <View key={item.id} style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => handleToggleFAQ(item.id)}
      >
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <FontAwesome
          name={item.isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#3498db"
        />
      </TouchableOpacity>
      {item.isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
    <View style={styles.container}>
        {/* Header */}
      <LinearGradient
          colors={['#3498db', '#2980b9']}
        style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
            <View style={styles.headerSpacer} />
          </View>
      </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search */}
      <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <FontAwesome name="search" size={16} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
                placeholder="Search help topics..."
                placeholderTextColor="#95a5a6"
              />
            </View>
          </View>

          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.activeCategoryChip
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.activeCategoryChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ Section */}
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {filteredFAQItems.map(renderFAQItem)}
                  </View>

          {/* Contact Support Section */}
          <Text style={styles.sectionTitle}>Still Need Help?</Text>
          <View style={styles.contactContainer}>
            <View style={styles.contactCard}>
              <FontAwesome name="phone" size={24} color="#3498db" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Call Support</Text>
                <Text style={styles.contactSubtitle}>+1-800-PHARMALINK</Text>
                <Text style={styles.contactHours}>Mon-Fri: 8AM-6PM EST</Text>
                </View>
              <TouchableOpacity style={styles.contactButton} onPress={handleCallSupport}>
                <FontAwesome name="phone" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.contactCard}>
              <FontAwesome name="envelope" size={24} color="#3498db" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactSubtitle}>support@pharmalink.com</Text>
                <Text style={styles.contactHours}>24/7 Response</Text>
                    </View>
              <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
                <FontAwesome name="envelope" size={16} color="#fff" />
              </TouchableOpacity>
                  </View>
                </View>

          {/* Support Request Form */}
          <Text style={styles.sectionTitle}>Send Support Request</Text>
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subject *</Text>
              <TextInput
                style={styles.formInput}
                value={contactForm.subject}
                onChangeText={(value) => setContactForm(prev => ({ ...prev, subject: value }))}
                placeholder="Brief description of your issue"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['Low', 'Medium', 'High'].map(priority => (
        <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      contactForm.priority === priority && styles.activePriorityButton
                    ]}
                    onPress={() => setContactForm(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      contactForm.priority === priority && styles.activePriorityButtonText
                    ]}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Message *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={contactForm.message}
                onChangeText={(value) => setContactForm(prev => ({ ...prev, message: value }))}
                placeholder="Describe your issue in detail..."
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleContactSupport}>
              <FontAwesome name="paper-plane" size={16} color="#fff" />
              <Text style={styles.submitButtonText}>Send Support Request</Text>
        </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  categoryContainer: {
    marginBottom: 20,
    paddingVertical: 0,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 6,
    alignItems: 'center',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    height: 36,
    justifyContent: 'center',
  },
  activeCategoryChip: {
    backgroundColor: '#3498db',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeCategoryChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    marginTop: 20,
  },
  faqContainer: {
    marginBottom: 20,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
  },
  contactContainer: {
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 2,
  },
  contactHours: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    color: '#2c3e50',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activePriorityButton: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activePriorityButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});