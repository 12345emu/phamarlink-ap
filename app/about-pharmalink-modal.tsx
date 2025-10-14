import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
// import * as Application from 'expo-application';

interface AboutPharmaLinkModalProps {
  visible: boolean;
  onClose: () => void;
}

const APP_FEATURES = [
  {
    icon: 'user-md',
    title: 'Patient Management',
    description: 'Comprehensive patient records, medical history, and appointment scheduling',
  },
  {
    icon: 'calendar',
    title: 'Appointment Scheduling',
    description: 'Easy appointment booking, rescheduling, and calendar management',
  },
  {
    icon: 'file-medical',
    title: 'Digital Prescriptions',
    description: 'Electronic prescription writing with pharmacy integration',
  },
  {
    icon: 'hospital',
    title: 'Hospital Affiliations',
    description: 'Manage your hospital partnerships and professional relationships',
  },
  {
    icon: 'stethoscope',
    title: 'Medical Specializations',
    description: 'Track your medical specializations and certifications',
  },
  {
    icon: 'shield-alt',
    title: 'HIPAA Compliance',
    description: 'Secure, HIPAA-compliant platform for patient data protection',
  },
  {
    icon: 'mobile-alt',
    title: 'Mobile Access',
    description: 'Access your practice anywhere with our mobile-first design',
  },
  {
    icon: 'chart-line',
    title: 'Analytics & Reports',
    description: 'Comprehensive practice analytics and performance reports',
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'Chief Medical Officer',
    specialty: 'Internal Medicine',
    experience: '15+ years',
  },
  {
    name: 'Michael Chen',
    role: 'Chief Technology Officer',
    specialty: 'Healthcare Technology',
    experience: '12+ years',
  },
  {
    name: 'Dr. Emily Rodriguez',
    role: 'Head of Clinical Affairs',
    specialty: 'Pediatrics',
    experience: '10+ years',
  },
  {
    name: 'David Thompson',
    role: 'Head of Product',
    specialty: 'Healthcare Innovation',
    experience: '8+ years',
  },
];

const LEGAL_LINKS = [
  {
    title: 'Privacy Policy',
    url: 'https://pharmalink.com/privacy',
    description: 'How we protect your data and patient information',
  },
  {
    title: 'Terms of Service',
    url: 'https://pharmalink.com/terms',
    description: 'Our terms and conditions for using PharmaLink',
  },
  {
    title: 'HIPAA Compliance',
    url: 'https://pharmalink.com/hipaa',
    description: 'Our commitment to HIPAA compliance and security',
  },
  {
    title: 'Data Security',
    url: 'https://pharmalink.com/security',
    description: 'Information about our security measures and protocols',
  },
];

export default function AboutPharmaLinkModal({ visible, onClose }: AboutPharmaLinkModalProps) {
  const [appVersion, setAppVersion] = useState<string>('');
  const [buildNumber, setBuildNumber] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadAppInfo();
    }
  }, [visible]);

  const loadAppInfo = async () => {
    try {
      // Fallback to static values since expo-application is not available
      setAppVersion('1.0.0');
      setBuildNumber('1');
    } catch (error) {
      console.error('❌ AboutPharmaLinkModal - Error loading app info:', error);
      setAppVersion('1.0.0');
      setBuildNumber('1');
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('❌ AboutPharmaLinkModal - Error opening link:', err);
      Alert.alert('Error', 'Unable to open link. Please try again.');
    });
  };

  const handleRateApp = () => {
    // TODO: Implement app store rating
    Alert.alert(
      'Rate PharmaLink',
      'Thank you for using PharmaLink! Your feedback helps us improve the app.',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Rate Now', onPress: () => {
          // Open app store rating
          console.log('🔍 AboutPharmaLinkModal - Opening app store rating');
        }}
      ]
    );
  };

  const handleShareApp = () => {
    // TODO: Implement app sharing
    Alert.alert(
      'Share PharmaLink',
      'Help other healthcare professionals discover PharmaLink!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => {
          console.log('🔍 AboutPharmaLinkModal - Sharing app');
        }}
      ]
    );
  };

  const renderFeature = (feature: typeof APP_FEATURES[0], index: number) => (
    <View key={index} style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <FontAwesome name={feature.icon as any} size={24} color="#3498db" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
    </View>
  );

  const renderTeamMember = (member: typeof TEAM_MEMBERS[0], index: number) => (
    <View key={index} style={styles.teamCard}>
      <View style={styles.teamAvatar}>
        <FontAwesome name="user" size={24} color="#3498db" />
      </View>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{member.name}</Text>
        <Text style={styles.teamRole}>{member.role}</Text>
        <Text style={styles.teamSpecialty}>{member.specialty}</Text>
        <Text style={styles.teamExperience}>{member.experience} experience</Text>
      </View>
    </View>
  );

  const renderLegalLink = (link: typeof LEGAL_LINKS[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.legalCard}
      onPress={() => handleOpenLink(link.url)}
    >
      <View style={styles.legalIcon}>
        <FontAwesome name="external-link" size={16} color="#3498db" />
      </View>
      <View style={styles.legalContent}>
        <Text style={styles.legalTitle}>{link.title}</Text>
        <Text style={styles.legalDescription}>{link.description}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#bdc3c7" />
    </TouchableOpacity>
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
            <Text style={styles.headerTitle}>About PharmaLink</Text>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* App Info */}
          <View style={styles.appInfoCard}>
            <View style={styles.appLogo}>
              <FontAwesome name="heartbeat" size={48} color="#3498db" />
            </View>
            <Text style={styles.appName}>PharmaLink</Text>
            <Text style={styles.appTagline}>Connecting Healthcare Professionals</Text>
            <Text style={styles.appVersion}>Version {appVersion} (Build {buildNumber})</Text>
            <Text style={styles.appDescription}>
              PharmaLink is a comprehensive healthcare platform designed to streamline 
              medical practice management, patient care, and professional networking 
              for healthcare professionals.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleRateApp}>
              <FontAwesome name="star" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Rate App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareApp}>
              <FontAwesome name="share" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Share App</Text>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresContainer}>
            {APP_FEATURES.map(renderFeature)}
          </View>

          {/* Mission */}
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <View style={styles.missionCard}>
            <Text style={styles.missionText}>
              To revolutionize healthcare delivery by providing healthcare professionals 
              with innovative tools and technologies that enhance patient care, improve 
              clinical outcomes, and streamline practice management.
            </Text>
          </View>

          {/* Team */}
          <Text style={styles.sectionTitle}>Our Team</Text>
          <View style={styles.teamContainer}>
            {TEAM_MEMBERS.map(renderTeamMember)}
          </View>

          {/* Statistics */}
          <Text style={styles.sectionTitle}>Platform Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>10,000+</Text>
              <Text style={styles.statLabel}>Healthcare Professionals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>500,000+</Text>
              <Text style={styles.statLabel}>Patients Served</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1M+</Text>
              <Text style={styles.statLabel}>Prescriptions Written</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>99.9%</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
          </View>

          {/* Legal Links */}
          <Text style={styles.sectionTitle}>Legal & Privacy</Text>
          <View style={styles.legalContainer}>
            {LEGAL_LINKS.map(renderLegalLink)}
          </View>

          {/* Contact Info */}
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <FontAwesome name="envelope" size={16} color="#3498db" />
              <Text style={styles.contactText}>info@pharmalink.com</Text>
            </View>
            <View style={styles.contactItem}>
              <FontAwesome name="phone" size={16} color="#3498db" />
              <Text style={styles.contactText}>+1-800-PHARMALINK</Text>
            </View>
            <View style={styles.contactItem}>
              <FontAwesome name="globe" size={16} color="#3498db" />
              <Text style={styles.contactText}>www.pharmalink.com</Text>
            </View>
            <View style={styles.contactItem}>
              <FontAwesome name="map-marker" size={16} color="#3498db" />
              <Text style={styles.contactText}>San Francisco, CA</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2024 PharmaLink. All rights reserved.
            </Text>
            <Text style={styles.footerText}>
              Made with ❤️ for healthcare professionals
            </Text>
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
  appInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 16,
    color: '#5a6c7d',
    lineHeight: 24,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    marginTop: 20,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
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
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
  },
  missionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missionText: {
    fontSize: 16,
    color: '#5a6c7d',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  teamContainer: {
    marginBottom: 20,
  },
  teamCard: {
    flexDirection: 'row',
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
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  teamRole: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
    marginBottom: 2,
  },
  teamSpecialty: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  teamExperience: {
    fontSize: 12,
    color: '#95a5a6',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  legalContainer: {
    marginBottom: 20,
  },
  legalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  legalDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  contactCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#5a6c7d',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 4,
  },
});
