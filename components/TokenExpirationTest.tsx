import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface TokenExpirationTestProps {
  style?: any;
}

export const TokenExpirationTest: React.FC<TokenExpirationTestProps> = ({ style }) => {
  const { testTokenExpiration, checkTokenExpiration, isAuthenticated } = useAuth();

  const handleTestTokenExpiration = async () => {
    if (!isAuthenticated) {
      Alert.alert('Not Authenticated', 'Please log in first to test token expiration.');
      return;
    }
    await testTokenExpiration();
  };

  const handleCheckTokenExpiration = async () => {
    if (!isAuthenticated) {
      Alert.alert('Not Authenticated', 'Please log in first to check token expiration.');
      return;
    }
    await checkTokenExpiration();
    Alert.alert('Token Check Complete', 'Token expiration check completed. Check console for details.');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Token Expiration Testing</Text>
      <Text style={styles.description}>
        Test the automatic logout functionality when tokens expire
      </Text>
      
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={handleTestTokenExpiration}
      >
        <Text style={styles.testButtonText}>🧪 Test Token Expiration</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.checkButton} 
        onPress={handleCheckTokenExpiration}
      >
        <Text style={styles.checkButtonText}>🔍 Check Token Status</Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        ⚠️ The test button will log you out immediately. Use with caution!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  checkButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
