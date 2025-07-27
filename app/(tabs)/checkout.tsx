import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { useOrders } from '../../context/OrdersContext';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';


const { width } = Dimensions.get('window');
const ACCENT = '#3498db';
const SUCCESS = '#43e97b';
const DANGER = '#e74c3c';

const paymentMethods = [
  { id: 'card1', type: 'Visa', last4: '1234', icon: 'cc-visa' },
  { id: 'card2', type: 'Mastercard', last4: '5678', icon: 'cc-mastercard' },
  { id: 'cash', type: 'Pay on Delivery', last4: '', icon: 'money' },
  { id: 'mobile', type: 'Mobile Money', last4: '', icon: 'mobile' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cart, clearCart } = useCart();
  const { addOrder } = useOrders();
  const [address, setAddress] = useState('123 Main St, Apt 4B, Accra, Ghana');
  const [selectedPayment, setSelectedPayment] = useState(paymentMethods[0].id);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.medicine.price * item.quantity, 0);
  const deliveryFee = 5.00;
  const tax = total * 0.05; // 5% tax
  const grandTotal = total + deliveryFee + tax;

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before placing an order.');
      return;
    }
    
    setPlacingOrder(true);
    
    // Simulate order processing
    setTimeout(() => {
    addOrder({
      items: cart,
      address,
      paymentMethod: selectedPayment,
        total: grandTotal,
    });
    clearCart();
      setPlacingOrder(false);
      Alert.alert(
        'Order Placed Successfully!',
        'Your order has been placed and is being processed.',
        [
          {
            text: 'View Orders',
            onPress: () => router.replace('/(tabs)/orders'),
          },
                     {
             text: 'Continue Shopping',
             onPress: () => router.push('/(tabs)/index' as any),
           }
        ]
      );
    }, 2000);
  };

  const handleBackPress = () => {
    if (cart.length > 0) {
      Alert.alert(
        'Leave Checkout?',
        'Your cart items will be saved. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get your current location.');
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const fullAddress = `${address.street || ''} ${address.name || ''} ${address.city || ''} ${address.region || ''} ${address.country || ''}`.trim();
        setAddress(fullAddress);
        Alert.alert('Location Updated', 'Your current location has been set as the delivery address!');
      } else {
        // Fallback to coordinates if reverse geocoding fails
        const coordinateAddress = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
        setAddress(coordinateAddress);
        Alert.alert('Location Updated', 'Coordinates set successfully! Please edit the address manually if needed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get your current location. Please try again or enter manually.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>


          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <FontAwesome name="shopping-cart" size={40} color="#95a5a6" />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                                 <TouchableOpacity 
                   style={styles.shopNowButton}
                   onPress={() => router.push('/(tabs)/index' as any)}
                   activeOpacity={0.7}
                 >
                  <Text style={styles.shopNowButtonText}>Shop Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              cart.map((item, idx) => (
                <View key={item.medicine.id || idx} style={styles.orderItem}>
                <Image source={{ uri: item.medicine.image }} style={styles.orderItemImage} />
                  <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.medicine.name}</Text>
                    <Text style={styles.orderItemQuantity}>Quantity: {item.quantity}</Text>
                  </View>
                  <View style={styles.orderItemPrice}>
                    <Text style={styles.priceText}>GHS {(item.medicine.price * item.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Delivery Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            
            {/* Use Current Location Button */}
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
              activeOpacity={0.7}
            >
              <FontAwesome 
                name={isGettingLocation ? "spinner" : "location-arrow"} 
                size={16} 
                color="#fff" 
                style={isGettingLocation && styles.spinningIcon}
              />
              <Text style={styles.locationButtonText}>
                {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.addressInput}>
              <FontAwesome name="map-marker" size={16} color={ACCENT} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter delivery address"
                placeholderTextColor="#95a5a6"
                multiline
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedPayment === method.id && styles.paymentMethodSelected
                ]}
                onPress={() => setSelectedPayment(method.id)}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodLeft}>
                  <FontAwesome name={method.icon as any} size={20} color={ACCENT} />
                  <Text style={styles.paymentMethodText}>
                    {method.type} {method.last4 && `**** ${method.last4}`}
                  </Text>
                </View>
                {selectedPayment === method.id && (
                  <FontAwesome name="check-circle" size={20} color={SUCCESS} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addPaymentButton} activeOpacity={0.7}>
              <FontAwesome name="plus-circle" size={16} color={ACCENT} />
              <Text style={styles.addPaymentText}>Add New Payment Method</Text>
            </TouchableOpacity>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>GHS {total.toFixed(2)}</Text>
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
        </ScrollView>

        {/* Place Order Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              cart.length === 0 && styles.placeOrderButtonDisabled
            ]}
            onPress={handlePlaceOrder}
            disabled={placingOrder || cart.length === 0}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={cart.length === 0 ? ['#95a5a6', '#7f8c8d'] : [ACCENT, '#2980b9']}
              style={styles.placeOrderGradient}
            >
              <FontAwesome 
                name={placingOrder ? "spinner" : "check"} 
                size={18} 
                color="#fff" 
                style={placingOrder && styles.spinningIcon}
              />
              <Text style={styles.placeOrderText}>
                {placingOrder ? 'Processing...' : 'Place Order'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 12,
    marginBottom: 20,
  },
  shopNowButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  orderItemPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    minHeight: 40,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  paymentMethodSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    fontWeight: '500',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addPaymentText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '500',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    color: ACCENT,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  placeOrderButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  spinningIcon: {
    transform: [{ rotate: '360deg' }],
  },
}); 