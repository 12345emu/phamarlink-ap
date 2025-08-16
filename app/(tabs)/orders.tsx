import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useOrders } from '../../context/OrdersContext';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';

interface OrderItem {
  id: number;
  order_id: number;
  medicine_id: number;
  pharmacy_medicine_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  medicine_name: string;
  generic_name: string;
  dosage_form: string;
  strength: string;
  prescription_required: number;
}

interface Order {
  id: number;
  order_number: string;
  patient_id: number;
  pharmacy_id: number;
  delivery_address: string;
  payment_method: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  pharmacy: {
    id: number;
    name: string;
    address: string;
    phone: string;
  };
}

export default function OrdersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'total'>('date');
  const router = useRouter();
  const { orders, loading, refreshOrders } = useOrders();
  const { addToCart } = useCart();

  // Refresh orders when component mounts
  useEffect(() => {
    refreshOrders();
  }, []);

  // Debug: Log the first order to see its structure
  if (orders.length > 0) {
    console.log('First order structure:', Object.keys(orders[0]));
    console.log('First order data:', orders[0]);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#8B5CF6';
      case 'preparing': return '#A855F7';
      case 'out_for_delivery': return '#FF5722';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-o';
      case 'confirmed': return 'check-circle';
      case 'preparing': return 'cog';
      case 'out_for_delivery': return 'truck';
      case 'delivered': return 'check-square';
      case 'cancelled': return 'times-circle';
      default: return 'question-circle';
    }
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (order.pharmacy?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || (order.order_status || '') === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'status':
          return (a.order_status || '').localeCompare(b.order_status || '');
        case 'total':
          return (b.final_amount || 0) - (a.final_amount || 0);
        default:
          return 0;
      }
    });

  const handleTrackOrder = (order: Order) => {
    // For now, show a placeholder since we don't have tracking implemented
    Alert.alert('Track Order', 'Tracking feature will be available soon.');
  };

  const handleReorder = (order: Order) => {
    Alert.alert(
      'Reorder',
      `Add all ${order.items.length} items from this order to cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add to Cart', 
          onPress: () => {
            order.items.forEach(item => {
              // Add each item to cart with its original quantity
              for (let i = 0; i < item.quantity; i++) {
                addToCart({
                  id: item.medicine_id,
                  name: item.medicine_name,
                  generic_name: item.generic_name,
                  category: 'Unknown',
                  prescription_required: item.prescription_required,
                  dosage_form: item.dosage_form,
                  strength: item.strength,
                  description: '',
                  manufacturer: 'Unknown',
                  image: null
                }, 1, item.unit_price);
              }
            });
            Alert.alert(
              'Added to Cart', 
              `${order.items.length} items have been added to your cart!`,
              [
                { text: 'Continue Shopping', style: 'cancel' },
                { text: 'View Cart', onPress: () => router.push('/(tabs)/cart' as any) }
              ]
            );
          }
        }
      ]
    );
  };

  const handleContactPharmacy = (order: Order) => {
    const phoneNumber = order.pharmacy?.phone || '';
    
    Alert.alert(
      'Contact Pharmacy',
      `How would you like to contact ${order.pharmacy?.name || 'the pharmacy'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            if (phoneNumber) {
              Linking.openURL(`tel:${phoneNumber}`);
            } else {
              Alert.alert('Contact', 'Phone number not available.');
            }
          }
        },
        { 
          text: 'Send Email', 
          onPress: () => {
            const pharmacyName = order.pharmacy?.name || 'pharmacy';
            const email = `${pharmacyName.toLowerCase().replace(/\s+/g, '')}@pharmalink.com`;
            const subject = 'Inquiry about my order';
            const body = `Hello, I have a question about my recent order (${order.order_number}).`;
            Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
            placeholder="Search orders by ID or pharmacy..."
            placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
      </View>

        {/* Filter Options */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.activeFilterChipText]}>
                All Orders
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterChip, activeFilter === 'pending' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('pending')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'pending' && styles.activeFilterChipText]}>
                Pending
              </Text>
            </TouchableOpacity>
            
              <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'confirmed' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('confirmed')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'confirmed' && styles.activeFilterChipText]}>
                Confirmed
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterChip, activeFilter === 'delivered' && styles.activeFilterChip]}
              onPress={() => setActiveFilter('delivered')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'delivered' && styles.activeFilterChipText]}>
                Delivered
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
                      <TouchableOpacity
              style={[styles.sortButton, sortBy === 'date' && styles.activeSortButton]}
              onPress={() => setSortBy('date')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'date' && styles.activeSortButtonText]}>
                Date
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'status' && styles.activeSortButton]}
              onPress={() => setSortBy('status')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'status' && styles.activeSortButtonText]}>
                Status
              </Text>
                      </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'total' && styles.activeSortButton]}
              onPress={() => setSortBy('total')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'total' && styles.activeSortButtonText]}>
                Total
              </Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView 
        style={styles.ordersList} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="shopping-bag" size={60} color="#95a5a6" />
            <Text style={styles.emptyStateTitle}>No orders found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || activeFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start shopping to see your orders here'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
                              <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{order.order_number || 'Unknown'}</Text>
                    <Text style={styles.orderDate}>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status || 'pending') }]}>
                    <FontAwesome name={getStatusIcon(order.order_status || 'pending') as any} size={12} color="#fff" />
                    <Text style={styles.statusText}>{getStatusText(order.order_status || 'pending')}</Text>
                  </View>
                    </View>

              <View style={styles.pharmacyInfo}>
                <FontAwesome name="medkit" size={14} color={ACCENT} />
                <Text style={styles.pharmacyName}>{order.pharmacy?.name || 'Unknown Pharmacy'}</Text>
              </View>

              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Items:</Text>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Image 
                      source={{ uri: 'https://via.placeholder.com/40x40/3498db/ffffff?text=M' }} 
                      style={styles.itemImage} 
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.medicine_name || 'Unknown Medicine'}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity || 0}</Text>
                    </View>
                    <Text style={styles.itemPrice}>GHS {item.unit_price ? Number(item.unit_price).toFixed(2) : '0.00'}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.orderDetails}>
                  <Text style={styles.deliveryAddress}>{order.delivery_address || 'No address specified'}</Text>
                  <Text style={styles.paymentMethod}>Payment: {order.payment_method || 'Unknown'}</Text>
                </View>
                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>GHS {Number(order.final_amount || 0).toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.orderActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleTrackOrder(order)}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="map-marker" size={14} color={ACCENT} />
                  <Text style={styles.actionButtonText}>Track</Text>
              </TouchableOpacity>

        <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleReorder(order)}
                  activeOpacity={0.7}
        >
                  <FontAwesome name="refresh" size={14} color={ACCENT} />
                  <Text style={styles.actionButtonText}>Reorder</Text>
        </TouchableOpacity>
                
          <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleContactPharmacy(order)}
                  activeOpacity={0.7}
          >
                  <FontAwesome name="phone" size={14} color={ACCENT} />
                  <Text style={styles.actionButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  searchSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeFilterChip: {
    backgroundColor: ACCENT,
  },
  filterChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  sortLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 12,
  },
  sortButton: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeSortButtonText: {
    color: '#fff',
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 20,
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
    paddingHorizontal: 40,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  pharmacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pharmacyName: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 6,
    fontWeight: '500',
  },
  itemsSection: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  orderDetails: {
    flex: 1,
  },
  deliveryAddress: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  orderTotal: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
    marginLeft: 4,
  },
}); 