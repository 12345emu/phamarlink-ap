import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, Text, Animated, Dimensions, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';

export default function CartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const [checkoutAnim] = useState(new Animated.Value(1));

  const cartTotal = cart.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
  const deliveryFee = 5.00;
  const tax = cartTotal * 0.05; // 5% tax
  const grandTotal = cartTotal + deliveryFee + tax;
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const handleCheckoutPressIn = () => {
    Animated.spring(checkoutAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleCheckoutPressOut = () => {
    Animated.spring(checkoutAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }
    router.push('/checkout');
  };

  const handleRemoveItem = (medicineId: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(medicineId) }
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearCart }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Clear Cart Button */}
      {cart.length > 0 && (
        <View style={styles.clearCartContainer}>
          <TouchableOpacity onPress={handleClearCart} activeOpacity={0.7}>
            <View style={styles.clearCartButton}>
              <FontAwesome name="trash" size={16} color={DANGER} />
              <Text style={styles.clearCartText}>Clear All</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Content */}
      <ScrollView style={styles.cartContent} showsVerticalScrollIndicator={false}>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <View style={styles.emptyCartIcon}>
              <FontAwesome name="shopping-cart" size={60} color="#95a5a6" />
            </View>
            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCartText}>
              Start shopping to add medicines to your cart
            </Text>
            <TouchableOpacity 
              style={styles.shopNowButton}
              onPress={() => router.push('/(tabs)/pharmacies')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[ACCENT, '#2980b9']}
                style={styles.shopNowGradient}
              >
                <FontAwesome name="search" size={16} color="#fff" />
                <Text style={styles.shopNowText}>Browse Pharmacies</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Cart Items */}
            <View style={styles.cartItems}>
                             {cart.map((item) => (
                 <View key={item.id} style={styles.cartItem}>
                                     <Image 
                     source={{ uri: item.medicine.image || 'https://via.placeholder.com/70x70?text=Medicine' }} 
                     style={styles.itemImage}
                     defaultSource={require('../../assets/images/icon.png')}
                   />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.medicine.name}</Text>
                    <Text style={styles.itemPrice}>GHS {Number(item.pricePerUnit).toFixed(2)}</Text>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="minus" size={12} color={item.quantity <= 1 ? "#95a5a6" : ACCENT} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="plus" size={12} color={ACCENT} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={styles.itemTotal}>
                      GHS {(Number(item.pricePerUnit) * item.quantity).toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="trash" size={14} color={DANGER} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Order Summary */}
            <View style={styles.orderSummary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items ({itemCount})</Text>
                <Text style={styles.summaryValue}>GHS {cartTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>GHS {deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (5%)</Text>
                <Text style={styles.summaryValue}>GHS {tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>GHS {grandTotal.toFixed(2)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Checkout Button */}
      {cart.length > 0 && (
        <View style={styles.checkoutContainer}>
          <Animated.View style={{ transform: [{ scale: checkoutAnim }] }}>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              onPressIn={handleCheckoutPressIn}
              onPressOut={handleCheckoutPressOut}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[ACCENT, '#2980b9']}
                style={styles.checkoutGradient}
              >
                <View style={styles.checkoutLeft}>
                  <FontAwesome name="credit-card" size={20} color="#fff" />
                  <View style={styles.checkoutTextContainer}>
                    <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                    <Text style={styles.checkoutSubtext}>{itemCount} items</Text>
                  </View>
                </View>
                <View style={styles.checkoutRight}>
                  <Text style={styles.checkoutTotal}>GHS {grandTotal.toFixed(2)}</Text>
                  <FontAwesome name="arrow-right" size={16} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  clearCartContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  clearCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearCartText: {
    fontSize: 14,
    color: DANGER,
    fontWeight: '500',
    marginLeft: 6,
  },
  cartContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyCartIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  shopNowButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shopNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cartItems: {
    marginBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  quantityButtonDisabled: {
    borderColor: '#ecf0f1',
    backgroundColor: '#f8f9fa',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginHorizontal: 20,
    minWidth: 24,
    textAlign: 'center',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 12,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ACCENT,
  },
  checkoutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Increased to account for tab bar
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  checkoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  checkoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkoutTextContainer: {
    marginLeft: 12,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  checkoutSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  checkoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutTotal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
}); 