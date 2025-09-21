import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text, Linking, Alert } from 'react-native';
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

interface AboutItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: () => void;
}

export default function AboutModal() {
  const router = useRouter();

  const aboutItems: AboutItem[] = [
    {
      id: 'version',
      title: 'App Version',
      subtitle: '1.0.0',
      icon: 'info-circle',
      color: ACCENT,
      action: () => {}
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      icon: 'shield',
      color: SUCCESS,
      action: () => handlePrivacyPolicy()
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      subtitle: 'Read our terms and conditions',
      icon: 'file-text',
      color: WARNING,
      action: () => handleTermsOfService()
    },
    {
      id: 'website',
      title: 'Visit Our Website',
      subtitle: 'pharmalink.com',
      icon: 'globe',
      color: ACCENT,
      action: () => handleVisitWebsite()
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      subtitle: 'Help us improve the app',
      icon: 'comment',
      color: DANGER,
      action: () => handleSendFeedback()
    }
  ];

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Our privacy policy explains how we collect, use, and protect your personal information.',
      [
        { text: 'View Online', onPress: () => Linking.openURL('https://pharmalink.com/privacy') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'Our terms of service outline the rules and regulations for using our app.',
      [
        { text: 'View Online', onPress: () => Linking.openURL('https://pharmalink.com/terms') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleVisitWebsite = () => {
    Alert.alert(
      'Visit Website',
      'Would you like to visit our website?',
      [
        { text: 'Open Website', onPress: () => Linking.openURL('https://pharmalink.com') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSendFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'We\'d love to hear from you! How would you like to send feedback?',
      [
        { text: 'Email', onPress: () => Linking.openURL('mailto:feedback@pharmalink.com') },
        { text: 'App Store Review', onPress: () => console.log('Open app store review') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderAboutItem = (item: AboutItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.aboutItemCard}
      onPress={item.action}
      activeOpacity={0.7}
      disabled={item.id === 'version'}
    >
      <View style={[styles.aboutItemIcon, { backgroundColor: `${item.color}15` }]}>
        <FontAwesome name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.aboutItemContent}>
        <Text style={styles.aboutItemTitle}>{item.title}</Text>
        <Text style={styles.aboutItemSubtitle}>{item.subtitle}</Text>
      </View>
      {item.id !== 'version' && (
        <FontAwesome name="chevron-right" size={16} color={DARK_GRAY} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
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
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info Section */}
        <View style={styles.appInfoSection}>
          <View style={styles.appIcon}>
            <FontAwesome name="heartbeat" size={40} color="white" />
          </View>
          <Text style={styles.appName}>PharmaLink</Text>
          <Text style={styles.appTagline}>Your Health, Our Priority</Text>
          <Text style={styles.appDescription}>
            PharmaLink is a comprehensive healthcare platform that connects patients with pharmacies, 
            doctors, and healthcare services. We make healthcare accessible, convenient, and reliable.
          </Text>
        </View>

        {/* About Items */}
        <View style={styles.aboutItemsSection}>
          <Text style={styles.sectionTitle}>App Information</Text>
          {aboutItems.map(renderAboutItem)}
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What We Offer</Text>
          
          <View style={styles.featureCard}>
            <FontAwesome name="shopping-cart" size={20} color={ACCENT} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Medicine Delivery</Text>
              <Text style={styles.featureDescription}>Get your medicines delivered to your doorstep</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <FontAwesome name="calendar" size={20} color={SUCCESS} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Doctor Appointments</Text>
              <Text style={styles.featureDescription}>Book appointments with qualified healthcare professionals</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <FontAwesome name="map-marker" size={20} color={WARNING} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Find Pharmacies</Text>
              <Text style={styles.featureDescription}>Locate nearby pharmacies and healthcare facilities</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <FontAwesome name="file-text" size={20} color={DANGER} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Prescription Management</Text>
              <Text style={styles.featureDescription}>Upload and manage your prescriptions digitally</Text>
            </View>
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.companySection}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.companyCard}>
            <Text style={styles.companyText}>
              PharmaLink is developed by a team of healthcare professionals and technology experts 
              dedicated to improving healthcare accessibility and patient experience.
            </Text>
            <Text style={styles.companyText}>
              Our mission is to bridge the gap between patients and healthcare providers, 
              making quality healthcare services more accessible and convenient for everyone.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 PharmaLink. All rights reserved.</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for better healthcare</Text>
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
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: PRIMARY,
    marginBottom: 8,
    letterSpacing: 1,
  },
  appTagline: {
    fontSize: 18,
    color: ACCENT,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  appDescription: {
    fontSize: 16,
    color: DARK_GRAY,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  aboutItemsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  aboutItemCard: {
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
  aboutItemIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aboutItemContent: {
    flex: 1,
  },
  aboutItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  aboutItemSubtitle: {
    fontSize: 14,
    color: DARK_GRAY,
    fontWeight: '500',
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featureCard: {
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
  featureContent: {
    marginLeft: 12,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: DARK_GRAY,
    fontWeight: '500',
    lineHeight: 20,
  },
  companySection: {
    marginBottom: 32,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  companyText: {
    fontSize: 15,
    color: DARK_GRAY,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: DARK_GRAY,
    fontWeight: '500',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '600',
  },
});
