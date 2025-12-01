import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { useProfile } from '../../context/ProfileContext';
import { getSafeProfileImageUrl } from '../../utils/imageUtils';
import { Image } from 'react-native';
import { pharmacistPrescriptionService } from '../../services/pharmacistPrescriptionService';
import { orderService } from '../../services/orderService';
import { pharmacistInventoryService } from '../../services/pharmacistInventoryService';
import { notificationsApiService } from '../../services/notificationsApiService';
import AddMedicineModal from '../../components/AddMedicineToInventoryModal';
import DrugLookupModal from '../../components/DrugLookupModal';
import PharmacistReportsModal from '../../components/PharmacistReportsModal';

const { width } = Dimensions.get('window');

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const { profileImage } = useProfile();
  const router = useRouter();
  const actionsScrollViewRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showDrugLookupModal, setShowDrugLookupModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [stats, setStats] = useState({
    todayPrescriptions: 12,
    pendingOrders: 5,
    lowStockItems: 8,
    unreadMessages: 3,
    todaySales: 2450,
    totalPatients: 156,
  });

  useEffect(() => {
    loadDashboardData();
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        prescriptionsResponse,
        ordersResponse,
        inventoryStatsResponse,
        unreadCountResponse,
      ] = await Promise.all([
        pharmacistPrescriptionService.getPrescriptionsToProcess('all', 100, 1),
        orderService.getOrders(1, 1000),
        pharmacistInventoryService.getInventoryStats(),
        notificationsApiService.getUnreadCount(),
      ]);

      // Calculate today's prescriptions
      let todayPrescriptions = 0;
      if (prescriptionsResponse.success && prescriptionsResponse.data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        todayPrescriptions = prescriptionsResponse.data.filter((prescription: any) => {
          const prescriptionDate = new Date(prescription.createdAt || prescription.created_at);
          prescriptionDate.setHours(0, 0, 0, 0);
          return prescriptionDate.getTime() === today.getTime();
        }).length;
      }

      // Calculate pending orders and today's sales
      let pendingOrders = 0;
      let todaySales = 0;
      if (ordersResponse.success && ordersResponse.data) {
        const orders = ordersResponse.data.orders || ordersResponse.data || [];
        
        // Count pending orders (pending, confirmed, preparing, out_for_delivery)
        pendingOrders = orders.filter((order: any) => {
          const status = (order.status || '').toLowerCase();
          return ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(status);
        }).length;

        // Calculate today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.created_at || order.updated_at || order.order_date);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        });
        
        todaySales = todayOrders.reduce((sum: number, order: any) => {
          return sum + (parseFloat(order.total_amount || order.final_amount || order.total || 0));
        }, 0);
      }

      // Get low stock items
      let lowStockItems = 0;
      if (inventoryStatsResponse.success && inventoryStatsResponse.data) {
        lowStockItems = inventoryStatsResponse.data.lowStockItems || 0;
      }

      // Get unread messages/notifications count
      let unreadMessages = 0;
      if (unreadCountResponse.success && unreadCountResponse.count !== undefined) {
        unreadMessages = unreadCountResponse.count;
      }

      setStats({
        todayPrescriptions,
        pendingOrders,
        lowStockItems,
        unreadMessages,
        todaySales: Math.round(todaySales),
        totalPatients: 0, // TODO: Implement if needed
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Keep existing stats on error to prevent UI flicker
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const quickStats = [
    {
      id: 'prescriptions',
      title: 'Today\'s Rx',
      icon: 'file-text-o',
      color: '#d4af37',
      count: stats.todayPrescriptions,
      onPress: () => router.push('/(pharmacist-tabs)/prescriptions'),
    },
    {
      id: 'orders',
      title: 'Pending Orders',
      icon: 'shopping-cart',
      color: '#8b2635',
      count: stats.pendingOrders,
      onPress: () => router.push('/(pharmacist-tabs)/prescriptions'),
    },
    {
      id: 'lowStock',
      title: 'Low Stock',
      icon: 'exclamation-triangle',
      color: '#c9a961',
      count: stats.lowStockItems,
      onPress: () => Alert.alert('Low Stock', 'View inventory to see low stock items'),
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: 'comments',
      color: '#5a4fcf',
      count: stats.unreadMessages,
      onPress: () => router.push('/(pharmacist-tabs)/chat'),
    },
  ];

  const quickActions = [
    {
      id: 'scan',
      title: 'Scan Barcode',
      icon: 'barcode',
      color: '#6b5ce7',
      gradient: ['#6b5ce7', '#5a4fcf'],
      onPress: () => router.push('/(pharmacist-tabs)/barcode-scanner'),
    },
    {
      id: 'processRx',
      title: 'Process Rx',
      icon: 'file-text-o',
      color: '#d4af37',
      gradient: ['#d4af37', '#c9a961'],
      onPress: () => router.push('/(pharmacist-tabs)/prescriptions'),
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: 'archive',
      color: '#2d3561',
      gradient: ['#2d3561', '#1a1f3a'],
      onPress: () => router.push('/(pharmacist-tabs)/inventory'),
    },
    {
      id: 'drugLookup',
      title: 'Drug Lookup',
      icon: 'search',
      color: '#8b2635',
      gradient: ['#8b2635', '#6d1d28'],
      onPress: () => setShowDrugLookupModal(true),
    },
    {
      id: 'addMedicine',
      title: 'Add Medicine',
      icon: 'plus-circle',
      color: '#b8941d',
      gradient: ['#b8941d', '#9a7d16'],
      onPress: () => setShowAddMedicineModal(true),
    },
    {
      id: 'orders',
      title: 'View Orders',
      icon: 'list-alt',
      color: '#a03042',
      gradient: ['#a03042', '#8b2635'],
      onPress: () => router.push('/(pharmacist-tabs)/orders'),
    },
    {
      id: 'patients',
      title: 'Patients',
      icon: 'users',
      color: '#3d4a7c',
      gradient: ['#3d4a7c', '#2d3561'],
      onPress: () => router.push('/(pharmacist-tabs)/patients'),
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'bar-chart',
      color: '#c9a961',
      gradient: ['#c9a961', '#b8941d'],
      onPress: () => setShowReportsModal(true),
    },
  ];

  const recentActivity = [
    { id: 1, type: 'prescription', message: 'New prescription from Dr. Smith', time: '5 min ago', icon: 'file-text-o', color: '#d4af37' },
    { id: 2, type: 'order', message: 'Order #1234 ready for pickup', time: '12 min ago', icon: 'shopping-cart', color: '#5a4fcf' },
    { id: 3, type: 'stock', message: 'Paracetamol running low (15 units)', time: '1 hour ago', icon: 'exclamation-triangle', color: '#c9a961' },
    { id: 4, type: 'patient', message: 'Patient consultation request', time: '2 hours ago', icon: 'user-md', color: '#8b2635' },
  ];

  // Auto-scroll quick actions
  useEffect(() => {
    if (quickActions.length === 0) return;

    const cardWidth = 110 + 12; // card width + margin
    const maxScroll = (quickActions.length * cardWidth) - width + 40; // total width - screen width + padding

    if (maxScroll <= 0) return; // Don't scroll if all cards fit on screen

    const autoScrollInterval = setInterval(() => {
      setScrollPosition((prev) => {
        const newPosition = prev + cardWidth;
        if (newPosition >= maxScroll) {
          // Reset to start after reaching the end
          setTimeout(() => {
            actionsScrollViewRef.current?.scrollTo({ x: 0, animated: false });
            setScrollPosition(0);
          }, 1000);
          return maxScroll;
        }
        actionsScrollViewRef.current?.scrollTo({ x: newPosition, animated: true });
        return newPosition;
      });
    }, 3000); // Scroll every 3 seconds

    return () => clearInterval(autoScrollInterval);
  }, [quickActions.length]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#d4af37']}
            tintColor="#d4af37"
          />
      }
    >
        {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#1a1f3a', '#2d3561', '#3d4a7c']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>
              {currentTime.getHours() < 12 ? 'Good Morning' : 
               currentTime.getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text style={styles.pharmacistName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => router.push('/(pharmacist-tabs)/profile')}
              activeOpacity={0.7}
            >
              {(() => {
                let imageUrl: string | null = null;
                
                if (profileImage) {
                  if (profileImage.startsWith('file://')) {
                    imageUrl = profileImage;
                  } else {
                    imageUrl = getSafeProfileImageUrl(profileImage);
                  }
                }
                
                return imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.headerProfileImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.warn('Failed to load header profile image:', error);
                    }}
                  />
                ) : (
                  <FontAwesome name="user" size={32} color="#fff" />
                );
              })()}
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          </View>
        </View>
        
        {/* Quick Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#95a5a6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines, patients, prescriptions..."
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={18} color="#95a5a6" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Quick Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          {quickStats.map((stat) => (
            <TouchableOpacity
              key={stat.id}
              style={styles.statCard}
              onPress={stat.onPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[stat.color + '15', stat.color + '05']}
                style={styles.statGradient}
            >
                <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                  <FontAwesome name={stat.icon as any} size={18} color={stat.color} />
              </View>
                <Text style={styles.statNumber}>{stat.count}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sales Summary Card */}
      <View style={styles.salesCard}>
        <LinearGradient
          colors={['#d4af37', '#c9a961', '#b8941d']}
          style={styles.salesGradient}
        >
          <View style={styles.salesContent}>
            <View>
              <Text style={styles.salesLabel}>Today's Sales</Text>
              <Text style={styles.salesAmount}>₵{stats.todaySales.toLocaleString()}</Text>
              <Text style={styles.salesSubtext}>From {stats.todayPrescriptions} prescriptions</Text>
            </View>
            <View style={styles.salesIconContainer}>
              <FontAwesome name="money" size={40} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Actions Row */}
      <View style={styles.actionsSection}>
        <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          ref={actionsScrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsScrollContent}
          style={styles.actionsScrollView}
          scrollEventThrottle={16}
          onScroll={(event) => {
            setScrollPosition(event.nativeEvent.contentOffset.x);
          }}
        >
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.gradient as any}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <FontAwesome name={action.icon as any} size={24} color="#fff" />
              <Text style={styles.actionText}>{action.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activityList}>
          {recentActivity.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.activityItem}
              activeOpacity={0.7}
            >
              <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                <FontAwesome name={activity.icon as any} size={18} color={activity.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#bdc3c7" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <FontAwesome name="exclamation-triangle" size={20} color="#c9a961" />
            <Text style={styles.alertTitle}>Low Stock Alert</Text>
          </View>
          <Text style={styles.alertText}>
            {stats.lowStockItems} {stats.lowStockItems === 1 ? 'item' : 'items'} running low. 
            Review inventory to restock.
          </Text>
          <TouchableOpacity style={styles.alertButton}>
            <Text style={styles.alertButtonText}>View Inventory</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />

      {/* Add Medicine Modal */}
      <AddMedicineModal
        visible={showAddMedicineModal}
        onClose={() => setShowAddMedicineModal(false)}
        onSuccess={() => {
          setShowAddMedicineModal(false);
          // Refresh dashboard data after adding medicine
          loadDashboardData();
        }}
      />

      {/* Drug Lookup Modal */}
      <DrugLookupModal
        visible={showDrugLookupModal}
        onClose={() => setShowDrugLookupModal(false)}
      />

      {/* Reports Modal */}
      <PharmacistReportsModal
        visible={showReportsModal}
        onClose={() => setShowReportsModal(false)}
      />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  scrollContent: {
    paddingBottom: 100,
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
    color: '#7f8c8d',
    fontWeight: '500',
  },
  // Header Styles
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontWeight: '500',
  },
  pharmacistName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
  },
  headerIconContainer: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  headerProfileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  timeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1a1f3a',
  },
  // Stats Styles
  statsContainer: {
    padding: 16,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 56) / 2,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statGradient: {
    padding: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1f3a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#5a5a5a',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Sales Card
  salesCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  salesGradient: {
    padding: 24,
  },
  salesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  salesAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  salesSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  salesIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Actions Section
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1f3a',
  },
  seeAllText: {
    fontSize: 14,
    color: '#d4af37',
    fontWeight: '600',
  },
  actionsScrollView: {
    marginHorizontal: -20,
  },
  actionsScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  actionCard: {
    width: 110,
    marginRight: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  // Activity Section
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 15,
    color: '#1a1f3a',
    fontWeight: '500',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#7a7a7a',
  },
  // Alert Card
  alertCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#fef9e7',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#c9a961',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b6914',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#8b6914',
    marginBottom: 12,
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: '#c9a961',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

