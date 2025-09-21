import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = '#3498db';
const LIGHT_GRAY = '#f8f9fa';
const DARK_GRAY = '#6c757d';
const PRIMARY = '#2c3e50';
const SUCCESS = '#27ae60';
const WARNING = '#f39c12';
const DANGER = '#e74c3c';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Account & Profile
  {
    id: '1',
    question: 'How do I update my profile information?',
    answer: 'Go to your Profile page and tap on any field you want to edit. You can update your name, email, phone number, and other personal details.',
    category: 'Account & Profile'
  },
  {
    id: '2',
    question: 'How do I change my password?',
    answer: 'In your Profile page, go to the Account section and tap "Change Password". Enter your current password and new password to update it.',
    category: 'Account & Profile'
  },
  {
    id: '3',
    question: 'How do I delete my account?',
    answer: 'To delete your account, please contact our support team. We\'ll guide you through the process and ensure your data is properly removed.',
    category: 'Account & Profile'
  },

  // Orders & Prescriptions
  {
    id: '4',
    question: 'How do I track my orders?',
    answer: 'Go to the Orders tab to view all your orders. Tap on any order to see detailed tracking information and current status.',
    category: 'Orders & Prescriptions'
  },
  {
    id: '5',
    question: 'How do I upload a prescription?',
    answer: 'In your Profile page, tap "Prescriptions" in the Account section. Then tap the "+" button to upload a prescription image from your device.',
    category: 'Orders & Prescriptions'
  },
  {
    id: '6',
    question: 'Can I cancel an order?',
    answer: 'You can cancel orders that are still being processed. Go to your Orders tab, select the order, and tap "Cancel Order" if available.',
    category: 'Orders & Prescriptions'
  },
  {
    id: '7',
    question: 'How do I reorder medicines?',
    answer: 'Go to your Orders tab, find a previous order, and tap "Reorder" to add the same medicines to your cart.',
    category: 'Orders & Prescriptions'
  },

  // Appointments
  {
    id: '8',
    question: 'How do I book an appointment?',
    answer: 'Go to the Appointments tab, tap "Book Appointment", select a doctor or hospital, choose a date and time, and confirm your booking.',
    category: 'Appointments'
  },
  {
    id: '9',
    question: 'Can I reschedule my appointment?',
    answer: 'Yes, go to your Appointments tab, select the appointment you want to reschedule, and tap "Reschedule" to choose a new date and time.',
    category: 'Appointments'
  },
  {
    id: '10',
    question: 'How do I cancel an appointment?',
    answer: 'In your Appointments tab, select the appointment and tap "Cancel Appointment". Please cancel at least 24 hours in advance.',
    category: 'Appointments'
  },

  // Medicines & Pharmacy
  {
    id: '11',
    question: 'How do I search for medicines?',
    answer: 'Go to the Medicines tab and use the search bar to find medicines by name, generic name, or condition. You can also browse by categories.',
    category: 'Medicines & Pharmacy'
  },
  {
    id: '12',
    question: 'How do I find nearby pharmacies?',
    answer: 'Go to the Pharmacies tab to see a list of nearby pharmacies. You can also use the map view to find pharmacies in your area.',
    category: 'Medicines & Pharmacy'
  },
  {
    id: '13',
    question: 'Are the medicines authentic?',
    answer: 'Yes, all medicines are sourced from licensed pharmacies and verified suppliers. We ensure authenticity and quality of all products.',
    category: 'Medicines & Pharmacy'
  },

  // Payment & Delivery
  {
    id: '14',
    question: 'What payment methods do you accept?',
    answer: 'We accept credit cards, debit cards, mobile money, and cash on delivery. Payment options may vary by location.',
    category: 'Payment & Delivery'
  },
  {
    id: '15',
    question: 'How long does delivery take?',
    answer: 'Delivery times vary by location. Standard delivery is 1-3 business days, while express delivery is same-day or next-day in select areas.',
    category: 'Payment & Delivery'
  },
  {
    id: '16',
    question: 'Is delivery free?',
    answer: 'Free delivery is available for orders above a certain amount. Check the delivery options during checkout for specific terms.',
    category: 'Payment & Delivery'
  },

  // Technical Support
  {
    id: '17',
    question: 'The app is not working properly. What should I do?',
    answer: 'Try closing and reopening the app, or restart your device. If the problem persists, contact our support team for assistance.',
    category: 'Technical Support'
  },
  {
    id: '18',
    question: 'How do I update the app?',
    answer: 'Go to your device\'s app store (Google Play Store or Apple App Store) and check for updates. Install any available updates for the best experience.',
    category: 'Technical Support'
  },
  {
    id: '19',
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login screen, tap "Forgot Password" and enter your email address. You\'ll receive instructions to reset your password.',
    category: 'Technical Support'
  }
];


export default function HelpFAQModal() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleContactSupport = () => {
    router.push('/contact-support-modal');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={[ACCENT, '#2980b9']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <TouchableOpacity
          onPress={handleContactSupport}
          style={styles.supportButton}
        >
          <FontAwesome name="headphones" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color={ACCENT} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQ..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={DARK_GRAY}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <FontAwesome name="times" size={14} color={DARK_GRAY} />
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* FAQ List */}
      <ScrollView style={styles.faqContainer} showsVerticalScrollIndicator={false}>
        {filteredFAQs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <FontAwesome name="question-circle" size={48} color={ACCENT} />
            </View>
            <Text style={styles.emptyStateText}>No FAQs found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or category filter
            </Text>
          </View>
        ) : (
          filteredFAQs.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleExpanded(faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqQuestionContent}>
                  <View style={styles.faqIconContainer}>
                    <FontAwesome name="question-circle" size={16} color={ACCENT} />
                  </View>
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                </View>
                <FontAwesome
                  name={expandedItems.has(faq.id) ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={ACCENT}
                />
              </TouchableOpacity>
              
              {expandedItems.has(faq.id) && (
                <View style={styles.faqAnswer}>
                  <View style={styles.faqAnswerContent}>
                    <View style={styles.faqAnswerIcon}>
                      <FontAwesome name="lightbulb-o" size={14} color={SUCCESS} />
                    </View>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Contact Support Button */}
      <View style={styles.contactContainer}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactSupport}
        >
          <LinearGradient
            colors={[ACCENT, '#2980b9']}
            style={styles.contactButtonGradient}
          >
            <FontAwesome name="headphones" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
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
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  supportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: PRIMARY,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  clearButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#f1f3f4',
  },
  faqContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyStateSubtext: {
    fontSize: 17,
    color: DARK_GRAY,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 40,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  faqQuestionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  faqIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  faqAnswerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  faqAnswerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  faqAnswerText: {
    flex: 1,
    fontSize: 15,
    color: DARK_GRAY,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  contactContainer: {
    padding: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  contactButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  contactButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
});
