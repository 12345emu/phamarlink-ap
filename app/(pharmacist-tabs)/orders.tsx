import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { orderService, Order, OrderItem } from '../../services/orderService';

const { width } = Dimensions.get('window');

export default function PharmacistOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [activeFilter, page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      // Note: orderService.getOrders doesn't accept status parameter directly
      // We'll filter client-side, but we could also modify the service to accept it
      const response = await orderService.getOrders(page, 20);
      
      if (response.success && response.data) {
        let ordersData = response.data.orders || [];
        
        // Apply status filter if not 'all'
        if (activeFilter !== 'all') {
          ordersData = ordersData.filter((order: Order) => 
            order.status?.toLowerCase() === activeFilter.toLowerCase()
          );
        }
        
        if (page === 1) {
          setOrders(ordersData);
        } else {
          setOrders(prev => [...prev, ...ordersData]);
        }
        setHasMore((response.data.orders || []).length === 20);
      } else {
        Alert.alert('Error', response.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadOrders();
  };

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

  const filteredOrders = orders.filter(order => {
    // Apply status filter
    if (activeFilter !== 'all' && order.status?.toLowerCase() !== activeFilter.toLowerCase()) {
      return false;
    }
    
    // Apply search filter
    const matchesSearch = 
      (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.phone || '').includes(searchQuery);
    return matchesSearch;
  });

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    Alert.alert(
      'Update Order Status',
      `Change order ${order.order_number} status to ${getStatusText(newStatus)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              // TODO: Implement update order status API call
              Alert.alert('Success', 'Order status updated successfully');
              loadOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to update order status');
            }
          },
        },
      ]
    );
  };

  const handleViewOrder = (order: Order) => {
    router.push({
      pathname: '/(pharmacist-tabs)/order-details',
      params: { orderId: order.id.toString() },
    });
  };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1f3a', '#2d3561']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order number, customer name..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.activeFilterChip,
              ]}
              onPress={() => {
                setActiveFilter(filter as any);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter && styles.activeFilterChipText,
                ]}
              >
                {filter === 'all' ? 'All' : getStatusText(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        contentContainerStyle={styles.ordersListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="inbox" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Orders will appear here'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusColor = getStatusColor(order.status);
            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => handleViewOrder(order)}
                activeOpacity={0.7}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>#{order.order_number}</Text>
                    <Text style={styles.customerName}>
                      {order.first_name} {order.last_name}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
                  >
                    <FontAwesome
                      name={getStatusIcon(order.status) as any}
                      size={12}
                      color={statusColor}
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderDetailRow}>
                    <FontAwesome name="calendar" size={14} color="#7a7a7a" />
                    <Text style={styles.orderDetailText}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <FontAwesome name="shopping-bag" size={14} color="#7a7a7a" />
                    <Text style={styles.orderDetailText}>
                      {order.items?.length || 0} items
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <FontAwesome name="money" size={14} color="#7a7a7a" />
                    <Text style={styles.orderAmount}>
                      ₵{order.final_amount?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderActions}>
                  {order.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(order, 'confirmed');
                      }}
                    >
                      <FontAwesome name="check" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'confirmed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.prepareButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(order, 'preparing');
                      }}
                    >
                      <FontAwesome name="cog" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Start Preparing</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'preparing' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deliverButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(order, 'out_for_delivery');
                      }}
                    >
                      <FontAwesome name="truck" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Out for Delivery</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleViewOrder(order);
                    }}
                  >
                    <FontAwesome name="eye" size={14} color="#d4af37" />
                    <Text style={[styles.actionButtonText, { color: '#d4af37' }]}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {hasMore && filteredOrders.length > 0 && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setPage(prev => prev + 1)}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7a7a7a',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1a1f3a',
  },
  filterContainer: {
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#d4af37',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a7a7a',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1f3a',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7a7a7a',
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#7a7a7a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 13,
    color: '#7a7a7a',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  prepareButton: {
    backgroundColor: '#8B5CF6',
  },
  deliverButton: {
    backgroundColor: '#FF5722',
  },
  viewButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4af37',
  },
});

