import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';

const { width } = Dimensions.get('window');
const ACCENT = '#8B5CF6';
const GLASS_BG = 'rgba(255,255,255,0.7)';

const mockOrder = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    price: 5.99,
    quantity: 2,
  },
  {
    id: 2,
    name: 'Ibuprofen 400mg',
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80',
    price: 7.99,
    quantity: 1,
  },
];

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
  const [address, setAddress] = useState('123 Main St, Apt 4B');
  const [selectedPayment, setSelectedPayment] = useState(paymentMethods[0].id);
  const [placingOrder, setPlacingOrder] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.medicine.price * item.quantity, 0);

  const handlePlaceOrder = () => {
    setPlacingOrder(true);
    addOrder({
      items: cart,
      address,
      paymentMethod: selectedPayment,
      total,
    });
    clearCart();
    setTimeout(() => {
      setPlacingOrder(false);
      router.replace('/(tabs)/orders');
    }, 1800);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <View style={styles.backBtnGlass}>
                <FontAwesome name="arrow-left" size={22} color={ACCENT} />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Order Summary */}
          <View style={styles.sectionGlass}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {cart.map((item, idx) => (
              <View key={item.medicine.id || idx} style={styles.orderItemRow}>
                <Image source={{ uri: item.medicine.image }} style={styles.orderItemImage} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.orderItemName}>{item.medicine.name}</Text>
                  <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                </View>
                <Text style={styles.orderItemPrice}>${(item.medicine.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View style={styles.sectionGlass}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.inputRow}>
              <FontAwesome name="map-marker" size={20} color={ACCENT} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter delivery address"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.sectionGlass}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentRow, selectedPayment === method.id && styles.paymentRowActive]}
                onPress={() => setSelectedPayment(method.id)}
                activeOpacity={0.8}
              >
                <FontAwesome name={method.icon as any} size={28} color={ACCENT} style={{ marginRight: 14 }} />
                <Text style={styles.paymentType}>{method.type} **** {method.last4}</Text>
                {selectedPayment === method.id && <FontAwesome name="check-circle" size={20} color={ACCENT} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addCardBtn} activeOpacity={0.8}>
              <FontAwesome name="plus-circle" size={20} color={ACCENT} style={{ marginRight: 8 }} />
              <Text style={styles.addCardText}>Add New Card</Text>
            </TouchableOpacity>
          </View>

          {/* Total */}
          <View style={styles.sectionGlass}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
        {/* Sticky Place Order Button */}
        <View style={styles.stickyBar}>
          <TouchableOpacity
            style={styles.placeOrderBtn}
            activeOpacity={0.85}
            onPress={handlePlaceOrder}
            disabled={placingOrder}
          >
            <LinearGradient
              colors={[ACCENT, '#A855F7']}
              style={styles.placeOrderBtnGradient}
            >
              <FontAwesome name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.placeOrderBtnText}>{placingOrder ? 'Placing Order...' : 'Place Order'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGlass: {
    backgroundColor: GLASS_BG,
    borderRadius: 22,
    padding: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 0.5,
  },
  sectionGlass: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 18,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderItemImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  orderItemQty: {
    fontSize: 12,
    color: '#888',
  },
  orderItemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: ACCENT,
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  paymentRowActive: {
    borderWidth: 2,
    borderColor: ACCENT,
    backgroundColor: 'rgba(139,92,246,0.13)',
  },
  paymentType: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    padding: 10,
  },
  addCardText: {
    fontSize: 15,
    color: ACCENT,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 20,
    color: ACCENT,
    fontWeight: 'bold',
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 20,
    paddingBottom: 32,
    zIndex: 100,
  },
  placeOrderBtn: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  placeOrderBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
  },
  placeOrderBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
}); 