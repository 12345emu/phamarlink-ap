import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';

export default function CartHeaderButton() {
  const router = useRouter();
  const { cart } = useCart();
  
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  const handleCartPress = () => {
    router.push('/cart');
  };

  return (
    <TouchableOpacity 
      style={styles.cartButton} 
      onPress={handleCartPress}
      activeOpacity={0.7}
    >
      <FontAwesome name="shopping-cart" size={18} color="#3498db" />
      {totalQuantity > 0 && (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>
            {totalQuantity}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 