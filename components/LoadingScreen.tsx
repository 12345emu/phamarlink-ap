import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function LoadingScreen() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show content after a minimum delay for better UX
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 800); // Reduced to 0.8 seconds since LogoPage will show for 7 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!showContent) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.backgroundGradient}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4facfe', '#00f2fe']}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <FontAwesome name="heartbeat" size={60} color="#fff" />
        </View>
        <Text style={styles.appName}>PharmaLink</Text>
        <Text style={styles.loadingText}>Loading...</Text>
        <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4facfe',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  spinner: {
    marginTop: 10,
  },
}); 