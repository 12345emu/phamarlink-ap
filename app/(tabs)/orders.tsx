import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, Text, Animated, Dimensions, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useOrders } from '../../context/OrdersContext';

const { width } = Dimensions.get('window');
const ACCENT = '#3498db';

interface LocalOrder {
  id: string;
  date: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total: number;
  items: Array<{
    medicine: {
      id: number;
      name: string;
      price: number;
      image: string;
    };
    quantity: number;
  }>;
  pharmacy: string;
  address: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export default function OrdersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'total'>('date');
  const router = useRouter();
  const { orders } = useOrders();

  // Sample orders data
  const sampleOrders: LocalOrder[] = [
    {
      id: "ORD-2024-001",
      date: "2024-01-15",
      status: "delivered",
      total: 45.99,
      items: [
        { medicine: { id: 1, name: "Paracetamol 500mg", price: 10.99, image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" }, quantity: 2 },
        { medicine: { id: 2, name: "Vitamin C 500mg", price: 12.00, image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 3, name: "Ibuprofen 400mg", price: 13.00, image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      pharmacy: "Alpha Pharmacy",
      address: "123 Main St, Accra",
      estimatedDelivery: "2024-01-16",
      trackingNumber: "TRK-123456789"
    },
    {
      id: "ORD-2024-002",
      date: "2024-01-14",
      status: "out_for_delivery",
      total: 28.50,
      items: [
        { medicine: { id: 4, name: "Amoxicillin 250mg", price: 25.00, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 5, name: "Bandages", price: 3.50, image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      pharmacy: "MediCare Pharmacy",
      address: "456 Oak Ave, Accra",
      estimatedDelivery: "2024-01-15",
      trackingNumber: "TRK-987654321"
    },
    {
      id: "ORD-2024-003",
      date: "2024-01-13",
      status: "confirmed",
      total: 67.25,
      items: [
        { medicine: { id: 6, name: "Vitamin D3 1000IU", price: 20.00, image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" }, quantity: 2 },
        { medicine: { id: 7, name: "Iron Supplements", price: 18.00, image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 8, name: "Pain Relief Gel", price: 11.25, image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      pharmacy: "Green Cross Pharmacy",
      address: "789 Pine St, Accra",
      estimatedDelivery: "2024-01-17"
    },
    {
      id: "ORD-2024-004",
      date: "2024-01-12",
      status: "pending",
      total: 15.99,
      items: [
        { medicine: { id: 9, name: "Aspirin 100mg", price: 8.00, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80" }, quantity: 1 },
        { medicine: { id: 10, name: "Antiseptic Solution", price: 7.99, image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=400&q=80" }, quantity: 1 }
      ],
      pharmacy: "WellCare Pharmacy",
      address: "321 Elm St, Accra"
    }
  ];

  const allOrders: LocalOrder[] = [...sampleOrders];

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

  const filteredOrders = allOrders
    .filter(order => {
      const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.pharmacy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || order.status === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'total':
          return b.total - a.total;
        default:
          return 0;
      }
    });

  const handleTrackOrder = (order: LocalOrder) => {
    if (order.trackingNumber) {
      Alert.alert('Track Order', `Tracking number: ${order.trackingNumber}`);
    } else {
      Alert.alert('Track Order', 'Tracking information not available yet.');
    }
  };

  const handleReorder = (order: LocalOrder) => {
    Alert.alert('Reorder', 'Would add all items from this order to cart');
  };

  const handleContactPharmacy = (pharmacy: string) => {
    Alert.alert('Contact Pharmacy', `Would contact ${pharmacy}`);
  };

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
      <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <FontAwesome name={getStatusIcon(order.status) as any} size={12} color="#fff" />
                  <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                </View>
              </View>

              <View style={styles.pharmacyInfo}>
                <FontAwesome name="medkit" size={14} color={ACCENT} />
                <Text style={styles.pharmacyName}>{order.pharmacy}</Text>
              </View>

              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Items:</Text>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Image source={{ uri: item.medicine.image }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.medicine.name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>GHS {item.medicine.price.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.orderDetails}>
                  <Text style={styles.deliveryAddress}>{order.address}</Text>
                  {order.estimatedDelivery && (
                    <Text style={styles.estimatedDelivery}>
                      Est. Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                    </Text>
                  )}
                  {order.trackingNumber && (
                    <Text style={styles.trackingNumber}>Track: {order.trackingNumber}</Text>
                  )}
                </View>
                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>GHS {order.total.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.orderActions}>
                {order.trackingNumber && (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleTrackOrder(order)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="map-marker" size={14} color={ACCENT} />
                    <Text style={styles.actionButtonText}>Track</Text>
                  </TouchableOpacity>
                )}
                
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
                  onPress={() => handleContactPharmacy(order.pharmacy)}
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
  estimatedDelivery: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  trackingNumber: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '500',
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