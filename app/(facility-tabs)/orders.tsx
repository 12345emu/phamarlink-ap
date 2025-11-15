import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useOrders } from '../../context/OrdersContext';
import { Order, OrderItem, orderService } from '../../services/orderService';
import { facilitiesService } from '../../services/facilitiesService';
import { apiClient } from '../../services/apiClient';

const PURPLE = '#9b59b6';
const ACCENT = '#9b59b6';

interface Facility {
  id: number;
  name: string;
}

export default function FacilityOrdersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled'>('all');
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [orderDetailsModal, setOrderDetailsModal] = useState<Order | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const router = useRouter();
  const { orders, loading, refreshOrders } = useOrders();

  useEffect(() => {
    loadFacilities();
    refreshOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadFacilities = async () => {
    try {
      setLoadingFacilities(true);
      const response = await facilitiesService.getMyFacilities();
      if (response.success && response.data) {
        setFacilities(response.data);
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshOrders(), loadFacilities()]);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#8B5CF6';
      case 'processing': return '#A855F7';
      case 'ready': return '#2196F3';
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
      case 'processing': return 'Processing';
      case 'ready': return 'Ready';
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
      case 'processing': return 'cog';
      case 'ready': return 'check-square-o';
      case 'out_for_delivery': return 'truck';
      case 'delivered': return 'check-square';
      case 'cancelled': return 'times-circle';
      default: return 'question-circle';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      'pending': 'confirmed',
      'confirmed': 'processing',
      'processing': 'ready',
      'ready': 'out_for_delivery',
      'out_for_delivery': 'delivered',
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    Alert.alert(
      'Update Order Status',
      `Are you sure you want to change this order status to "${getStatusText(newStatus)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setUpdatingStatus(order.id);
              console.log(`🔄 Updating order ${order.id} status to ${newStatus}`);
              
              const response = await apiClient.patch(`/orders/${order.id}/status`, {
                status: newStatus,
              });

              console.log('📥 Update status response:', response);

              if (response.success) {
                console.log('✅ Order status updated successfully');
                Alert.alert('Success', 'Order status updated successfully');
                // Refresh orders to get updated data
                await refreshOrders();
                // Also close the modal if it's open
                if (orderDetailsModal && orderDetailsModal.id === order.id) {
                  setOrderDetailsModal(null);
                }
              } else {
                console.error('❌ Update failed:', response.message);
                Alert.alert('Error', response.message || 'Failed to update order status');
              }
            } catch (error: any) {
              console.error('❌ Error updating order status:', error);
              const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update order status';
              Alert.alert('Error', errorMessage);
            } finally {
              setUpdatingStatus(null);
            }
          }
        }
      ]
    );
  };

  const handleCancelOrder = async (order: Order) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order ${order.order_number}? This action cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingStatus(order.id);
              const response = await apiClient.patch(`/orders/${order.id}/status`, {
                status: 'cancelled',
              });

              if (response.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                await refreshOrders();
              } else {
                Alert.alert('Error', response.message || 'Failed to cancel order');
              }
            } catch (error: any) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', error.message || 'Failed to cancel order');
            } finally {
              setUpdatingStatus(null);
            }
          }
        }
      ]
    );
  };

  // Calculate statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    outForDelivery: orders.filter(o => o.status === 'out_for_delivery').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.final_amount || 0), 0),
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = 
        (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.pharmacy?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (`${order.first_name || ''} ${order.last_name || ''}`).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || (order.status || '') === activeFilter;
      const matchesFacility = !selectedFacility || order.pharmacy_id === selectedFacility;
      return matchesSearch && matchesFilter && matchesFacility;
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Statistics Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <FontAwesome name="shopping-cart" size={16} color={PURPLE} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="clock-o" size={16} color="#FF9800" />
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="cog" size={16} color="#A855F7" />
          <Text style={styles.statValue}>{stats.preparing}</Text>
          <Text style={styles.statLabel}>Preparing</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="truck" size={16} color="#FF5722" />
          <Text style={styles.statValue}>{stats.outForDelivery}</Text>
          <Text style={styles.statLabel}>Out for Delivery</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="check-square" size={16} color="#10B981" />
          <Text style={styles.statValue}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="money" size={16} color="#27ae60" />
          <Text style={styles.statValue}>GHS {stats.totalRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </ScrollView>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID, customer, or pharmacy..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Facility Filter */}
        {facilities.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facilityFilter}>
            <TouchableOpacity
              style={[styles.facilityChip, !selectedFacility && styles.activeFacilityChip]}
              onPress={() => setSelectedFacility(null)}
            >
              <Text style={[styles.facilityChipText, !selectedFacility && styles.activeFacilityChipText]}>
                All Facilities
              </Text>
            </TouchableOpacity>
            {facilities.map(facility => (
              <TouchableOpacity
                key={facility.id}
                style={[styles.facilityChip, selectedFacility === facility.id && styles.activeFacilityChip]}
                onPress={() => setSelectedFacility(facility.id)}
              >
                <Text style={[styles.facilityChipText, selectedFacility === facility.id && styles.activeFacilityChipText]}>
                  {facility.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, activeFilter === status && styles.activeFilterChip]}
              onPress={() => setActiveFilter(status as any)}
            >
              <Text style={[styles.filterChipText, activeFilter === status && styles.activeFilterChipText]}>
                {status === 'all' ? 'All' : getStatusText(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="shopping-bag" size={60} color="#95a5a6" />
            <Text style={styles.emptyStateTitle}>No orders found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || activeFilter !== 'all' || selectedFacility
                ? 'Try adjusting your search or filters'
                : 'No orders have been placed yet'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const nextStatus = getNextStatus(order.status || 'pending');
            const isUpdating = updatingStatus === order.id;

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{order.order_number || `#${order.id}`}</Text>
                    <Text style={styles.orderDate}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Unknown'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status || 'pending') }]}>
                    <FontAwesome name={getStatusIcon(order.status || 'pending') as any} size={12} color="#fff" />
                    <Text style={styles.statusText}>{getStatusText(order.status || 'pending')}</Text>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.customerInfo}>
                  <FontAwesome name="user" size={14} color={PURPLE} />
                  <Text style={styles.customerName}>
                    {order.first_name && order.last_name
                      ? `${order.first_name} ${order.last_name}`
                      : 'Customer'}
                  </Text>
                  {order.email && (
                    <Text style={styles.customerEmail}>{order.email}</Text>
                  )}
                  {order.phone && (
                    <Text style={styles.customerPhone}>{order.phone}</Text>
                  )}
                </View>

                {/* Pharmacy Info */}
                <View style={styles.pharmacyInfo}>
                  <FontAwesome name="building" size={14} color={PURPLE} />
                  <Text style={styles.pharmacyName}>{order.pharmacy?.name || 'Unknown Pharmacy'}</Text>
                </View>

                {/* Items Summary */}
                <View style={styles.itemsSection}>
                  <Text style={styles.itemsTitle}>
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                  </Text>
                  {order.items?.slice(0, 2).map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.medicine_name || 'Unknown Medicine'}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                  ))}
                  {order.items && order.items.length > 2 && (
                    <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
                  )}
                </View>

                {/* Order Total */}
                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>GHS {Number(order.final_amount || 0).toFixed(2)}</Text>
                </View>

                {/* Delivery Address */}
                {order.delivery_address && (
                  <View style={styles.deliveryInfo}>
                    <FontAwesome name="map-marker" size={12} color="#7f8c8d" />
                    <Text style={styles.deliveryAddress} numberOfLines={2}>
                      {order.delivery_address}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={async () => {
                      try {
                        setLoadingOrderDetails(true);
                        // Fetch full order details to ensure we have all items
                        const orderResponse = await orderService.getOrder(order.id);
                        if (orderResponse.success && orderResponse.data) {
                          setOrderDetailsModal(orderResponse.data);
                        } else {
                          // Fallback to using the order from the list
                          setOrderDetailsModal(order);
                        }
                      } catch (error) {
                        console.error('Error loading order details:', error);
                        // Fallback to using the order from the list
                        setOrderDetailsModal(order);
                      } finally {
                        setLoadingOrderDetails(false);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={loadingOrderDetails}
                  >
                    {loadingOrderDetails ? (
                      <ActivityIndicator size="small" color={PURPLE} />
                    ) : (
                      <>
                        <FontAwesome name="eye" size={14} color={PURPLE} />
                        <Text style={styles.viewDetailsText}>View Details</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {nextStatus && order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <TouchableOpacity
                      style={[styles.updateStatusButton, { backgroundColor: getStatusColor(nextStatus) }]}
                      onPress={() => handleUpdateStatus(order, nextStatus)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <FontAwesome name="arrow-right" size={14} color="#fff" />
                          <Text style={styles.updateStatusText}>Mark as {getStatusText(nextStatus)}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelOrder(order)}
                      disabled={isUpdating}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="times" size={14} color="#e74c3c" />
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        visible={orderDetailsModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOrderDetailsModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setOrderDetailsModal(null)}>
                <FontAwesome name="times" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>
            {orderDetailsModal && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Number</Text>
                  <Text style={styles.detailValue}>{orderDetailsModal.order_number || `#${orderDetailsModal.id}`}</Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadgeInline, { backgroundColor: getStatusColor(orderDetailsModal.status || 'pending') }]}>
                    <FontAwesome name={getStatusIcon(orderDetailsModal.status || 'pending') as any} size={12} color="#fff" />
                    <Text style={styles.statusTextInline}>{getStatusText(orderDetailsModal.status || 'pending')}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {orderDetailsModal.first_name && orderDetailsModal.last_name
                      ? `${orderDetailsModal.first_name} ${orderDetailsModal.last_name}`
                      : 'Customer'}
                  </Text>
                  {orderDetailsModal.email && (
                    <Text style={styles.detailSubValue}>{orderDetailsModal.email}</Text>
                  )}
                  {orderDetailsModal.phone && (
                    <Text style={styles.detailSubValue}>{orderDetailsModal.phone}</Text>
                  )}
                </View>

                {orderDetailsModal.pharmacy && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Pharmacy</Text>
                    <Text style={styles.detailValue}>{orderDetailsModal.pharmacy.name || 'N/A'}</Text>
                    {orderDetailsModal.pharmacy.address && (
                      <Text style={styles.detailSubValue}>{orderDetailsModal.pharmacy.address}</Text>
                    )}
                    {orderDetailsModal.pharmacy.phone && (
                      <Text style={styles.detailSubValue}>{orderDetailsModal.pharmacy.phone}</Text>
                    )}
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Items</Text>
                  {orderDetailsModal.items && orderDetailsModal.items.length > 0 ? (
                    orderDetailsModal.items.map((item, index) => (
                      <View key={item.id || index} style={styles.detailItem}>
                        <Text style={styles.detailValue}>
                          {item.medicine_name || 'Unknown Medicine'} - Qty: {item.quantity || 0} × GHS {Number(item.unit_price || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.detailSubValue}>Total: GHS {Number(item.total_price || 0).toFixed(2)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailSubValue}>No items found</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Delivery Address</Text>
                  <Text style={styles.detailValue}>{orderDetailsModal.delivery_address || 'N/A'}</Text>
                  {orderDetailsModal.delivery_instructions && (
                    <Text style={styles.detailSubValue}>Instructions: {orderDetailsModal.delivery_instructions}</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>{orderDetailsModal.payment_method || 'N/A'}</Text>
                  {orderDetailsModal.payment_status && (
                    <Text style={styles.detailSubValue}>Status: {orderDetailsModal.payment_status}</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Date</Text>
                  <Text style={styles.detailValue}>
                    {orderDetailsModal.created_at 
                      ? new Date(orderDetailsModal.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Amount Breakdown</Text>
                  <View style={styles.amountBreakdown}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Subtotal:</Text>
                      <Text style={styles.amountValue}>GHS {Number(orderDetailsModal.total_amount || 0).toFixed(2)}</Text>
                    </View>
                    {orderDetailsModal.tax_amount > 0 && (
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Tax:</Text>
                        <Text style={styles.amountValue}>GHS {Number(orderDetailsModal.tax_amount || 0).toFixed(2)}</Text>
                      </View>
                    )}
                    {orderDetailsModal.discount_amount > 0 && (
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Discount:</Text>
                        <Text style={styles.amountValue}>- GHS {Number(orderDetailsModal.discount_amount || 0).toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={[styles.amountRow, styles.totalRow]}>
                      <Text style={styles.modalTotalLabel}>Total Amount:</Text>
                      <Text style={styles.modalTotalValue}>GHS {Number(orderDetailsModal.final_amount || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  statsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    maxHeight: 100,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    minWidth: 90,
    maxWidth: 90,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  facilityFilter: {
    marginBottom: 12,
  },
  facilityChip: {
    backgroundColor: '#f1f2f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFacilityChip: {
    backgroundColor: PURPLE,
  },
  facilityChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeFacilityChipText: {
    color: '#fff',
  },
  filterContainer: {
    marginTop: 8,
  },
  filterChip: {
    backgroundColor: '#f1f2f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: PURPLE,
  },
  filterChipText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 6,
    marginRight: 12,
  },
  customerEmail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 6,
  },
  customerPhone: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 6,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    color: '#2c3e50',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  moreItems: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PURPLE,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryAddress: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 6,
    flex: 1,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f2f6',
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 12,
    color: PURPLE,
    fontWeight: '500',
  },
  updateStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  updateStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffe5e5',
    gap: 6,
  },
  cancelText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  detailSubValue: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  detailItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  statusBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusTextInline: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  amountBreakdown: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  amountValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalTotalLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  modalTotalValue: {
    fontSize: 18,
    color: PURPLE,
    fontWeight: 'bold',
  },
});
