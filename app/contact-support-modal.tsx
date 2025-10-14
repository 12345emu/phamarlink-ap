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

interface SupportRequest {
  id: string;
  subject: string;
  message: string;
  priority: string;
  category: string;
  status: string;
  createdAt: string;
  response?: string;
  respondedAt?: string;
}

interface ContactSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

const SUPPORT_CATEGORIES = [
  'Technical Issues',
  'Account Problems',
  'Billing Questions',
  'Feature Requests',
  'General Inquiry',
  'Emergency Support',
];

const PRIORITY_LEVELS = [
  { label: 'Low', value: 'Low', color: '#27ae60', description: 'Non-urgent questions' },
  { label: 'Medium', value: 'Medium', color: '#f39c12', description: 'Standard support needs' },
  { label: 'High', value: 'High', color: '#e74c3c', description: 'Urgent issues affecting work' },
  { label: 'Emergency', value: 'Emergency', color: '#8e44ad', description: 'Critical system issues' },
];

const SUPPORT_HOURS = {
  phone: 'Mon-Fri: 8AM-6PM EST',
  email: '24/7 Response',
  chat: 'Mon-Fri: 9AM-5PM EST',
  emergency: '24/7 Emergency Line',
};

export default function ContactSupportModal({ visible, onClose }: ContactSupportModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'contact' | 'request' | 'history'>('contact');
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  
  const [requestForm, setRequestForm] = useState({
    subject: '',
    message: '',
    category: 'General Inquiry',
    priority: 'Medium',
  });

  // Load support requests when modal opens
  useEffect(() => {
    if (visible) {
      loadSupportRequests();
    }
  }, [visible]);

  const loadSupportRequests = async () => {
    setLoading(true);
    try {
      // TODO: Load from backend/AsyncStorage
      console.log('🔍 ContactSupportModal - Loading support requests...');
      // For now, using sample data
      setSupportRequests([
        {
          id: '1',
          subject: 'App crashing on startup',
          message: 'The app crashes immediately when I try to open it. This started happening after the latest update.',
          priority: 'High',
          category: 'Technical Issues',
          status: 'In Progress',
          createdAt: '2024-01-15T10:30:00Z',
          response: 'We\'ve identified the issue and are working on a fix. A patch will be released within 24 hours.',
          respondedAt: '2024-01-15T14:20:00Z',
        },
        {
          id: '2',
          subject: 'Billing question about fees',
          message: 'I noticed an unexpected charge on my account. Can you help me understand what this fee is for?',
          priority: 'Medium',
          category: 'Billing Questions',
          status: 'Resolved',
          createdAt: '2024-01-10T09:15:00Z',
          response: 'The charge was for premium features you activated. I\'ve provided a detailed breakdown in your billing section.',
          respondedAt: '2024-01-10T11:45:00Z',
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('❌ ContactSupportModal - Error loading support requests:', error);
      setLoading(false);
    }
  };

  const handleCallSupport = () => {
    const phoneNumber = '+1-800-PHARMALINK';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleCallEmergency = () => {
    const phoneNumber = '+1-800-PHARMALINK-911';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmailSupport = () => {
    const email = 'support@pharmalink.com';
    const subject = 'Support Request';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  const handleStartChat = () => {
    Alert.alert(
      'Live Chat',
      'Live chat is currently unavailable. Please use phone or email support, or submit a support request.',
      [{ text: 'OK' }]
    );
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.subject.trim() || !requestForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const newRequest: SupportRequest = {
        id: Date.now().toString(),
        subject: requestForm.subject,
        message: requestForm.message,
        priority: requestForm.priority,
        category: requestForm.category,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
      };

      // TODO: Save to backend
      console.log('🔍 ContactSupportModal - Submitting support request:', newRequest);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSupportRequests(prev => [newRequest, ...prev]);
      setRequestForm({ subject: '', message: '', category: 'General Inquiry', priority: 'Medium' });
      
      Alert.alert('Success', 'Your support request has been submitted. We\'ll get back to you within 24 hours.', [
        { text: 'OK', onPress: () => setActiveTab('history') }
      ]);
    } catch (error) {
      console.error('❌ ContactSupportModal - Error submitting support request:', error);
      Alert.alert('Error', 'Failed to submit support request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return '#3498db';
      case 'In Progress': return '#f39c12';
      case 'Resolved': return '#27ae60';
      case 'Closed': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const getPriorityColor = (priority: string) => {
    const priorityLevel = PRIORITY_LEVELS.find(p => p.value === priority);
    return priorityLevel?.color || '#7f8c8d';
  };

  const renderContactMethods = () => (
    <View style={styles.tabContent}>
      {/* Phone Support */}
      <View style={styles.contactCard}>
        <View style={styles.contactIcon}>
          <FontAwesome name="phone" size={24} color="#3498db" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Phone Support</Text>
          <Text style={styles.contactSubtitle}>+1-800-PHARMALINK</Text>
          <Text style={styles.contactHours}>{SUPPORT_HOURS.phone}</Text>
          <Text style={styles.contactDescription}>
            Speak directly with our support team for immediate assistance
          </Text>
        </View>
        <TouchableOpacity style={styles.contactButton} onPress={handleCallSupport}>
          <FontAwesome name="phone" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Emergency Line */}
      <View style={styles.contactCard}>
        <View style={styles.contactIcon}>
          <FontAwesome name="exclamation-triangle" size={24} color="#e74c3c" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Emergency Line</Text>
          <Text style={styles.contactSubtitle}>+1-800-PHARMALINK-911</Text>
          <Text style={styles.contactHours}>{SUPPORT_HOURS.emergency}</Text>
          <Text style={styles.contactDescription}>
            For critical issues affecting patient care
          </Text>
        </View>
        <TouchableOpacity style={[styles.contactButton, styles.emergencyButton]} onPress={handleCallEmergency}>
          <FontAwesome name="phone" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Email Support */}
      <View style={styles.contactCard}>
        <View style={styles.contactIcon}>
          <FontAwesome name="envelope" size={24} color="#3498db" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Email Support</Text>
          <Text style={styles.contactSubtitle}>support@pharmalink.com</Text>
          <Text style={styles.contactHours}>{SUPPORT_HOURS.email}</Text>
          <Text style={styles.contactDescription}>
            Send detailed messages with attachments
          </Text>
        </View>
        <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
          <FontAwesome name="envelope" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Live Chat */}
      <View style={styles.contactCard}>
        <View style={styles.contactIcon}>
          <FontAwesome name="comments" size={24} color="#3498db" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Live Chat</Text>
          <Text style={styles.contactSubtitle}>Chat with support</Text>
          <Text style={styles.contactHours}>{SUPPORT_HOURS.chat}</Text>
          <Text style={styles.contactDescription}>
            Real-time chat with our support team
          </Text>
        </View>
        <TouchableOpacity style={styles.contactButton} onPress={handleStartChat}>
          <FontAwesome name="comments" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSupportRequest = () => (
    <View style={styles.tabContent}>
      <View style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Subject *</Text>
          <TextInput
            style={styles.formInput}
            value={requestForm.subject}
            onChangeText={(value) => setRequestForm(prev => ({ ...prev, subject: value }))}
            placeholder="Brief description of your issue"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Category *</Text>
          <View style={styles.categoryContainer}>
            {SUPPORT_CATEGORIES.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  requestForm.category === category && styles.activeCategoryChip
                ]}
                onPress={() => setRequestForm(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryChipText,
                  requestForm.category === category && styles.activeCategoryChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Priority *</Text>
          <View style={styles.priorityContainer}>
            {PRIORITY_LEVELS.map(priority => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityButton,
                  requestForm.priority === priority.value && styles.activePriorityButton
                ]}
                onPress={() => setRequestForm(prev => ({ ...prev, priority: priority.value }))}
              >
                <View style={[styles.priorityIndicator, { backgroundColor: priority.color }]} />
                <View style={styles.priorityInfo}>
                  <Text style={[
                    styles.priorityLabel,
                    requestForm.priority === priority.value && styles.activePriorityLabel
                  ]}>
                    {priority.label}
                  </Text>
                  <Text style={styles.priorityDescription}>{priority.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Message *</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            value={requestForm.message}
            onChangeText={(value) => setRequestForm(prev => ({ ...prev, message: value }))}
            placeholder="Describe your issue in detail..."
            multiline
            numberOfLines={6}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmitRequest}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="paper-plane" size={16} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Support Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSupportHistory = () => (
    <View style={styles.tabContent}>
      {supportRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="inbox" size={48} color="#bdc3c7" />
          <Text style={styles.emptyStateTitle}>No Support Requests</Text>
          <Text style={styles.emptyStateText}>
            You haven't submitted any support requests yet.
          </Text>
        </View>
      ) : (
        <View style={styles.historyContainer}>
          {supportRequests.map(request => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestSubject}>{request.subject}</Text>
                <View style={styles.requestMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.statusText}>{request.status}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.priority) }]}>
                    <Text style={styles.priorityText}>{request.priority}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.requestCategory}>{request.category}</Text>
              <Text style={styles.requestMessage}>{request.message}</Text>
              
              {request.response && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>Support Response:</Text>
                  <Text style={styles.responseText}>{request.response}</Text>
                  <Text style={styles.responseDate}>
                    Responded: {new Date(request.respondedAt!).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              <Text style={styles.requestDate}>
                Submitted: {new Date(request.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
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
            <Text style={styles.headerTitle}>Contact Support</Text>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
            onPress={() => setActiveTab('contact')}
          >
            <FontAwesome name="phone" size={16} color={activeTab === 'contact' ? '#fff' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === 'contact' && styles.activeTabText]}>
              Contact
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'request' && styles.activeTab]}
            onPress={() => setActiveTab('request')}
          >
            <FontAwesome name="paper-plane" size={16} color={activeTab === 'request' ? '#fff' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === 'request' && styles.activeTabText]}>
              Request
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <FontAwesome name="history" size={16} color={activeTab === 'history' ? '#fff' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'contact' && renderContactMethods()}
          {activeTab === 'request' && renderSupportRequest()}
          {activeTab === 'history' && renderSupportHistory()}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 2,
  },
  contactHours: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 18,
  },
  contactButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
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
    height: 120,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  activeCategoryChip: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeCategoryChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  priorityContainer: {
    gap: 12,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  activePriorityButton: {
    backgroundColor: '#e8f4f8',
    borderColor: '#3498db',
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  priorityInfo: {
    flex: 1,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  activePriorityLabel: {
    color: '#3498db',
  },
  priorityDescription: {
    fontSize: 12,
    color: '#7f8c8d',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyContainer: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  requestMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  requestCategory: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 8,
  },
  requestMessage: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 18,
    marginBottom: 8,
  },
  responseDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  requestDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});