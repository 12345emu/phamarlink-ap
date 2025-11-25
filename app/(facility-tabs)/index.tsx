import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';
import { useRouter, type Href } from 'expo-router';
import { facilitiesService } from '../../services/facilitiesService';
import { useOrders } from '../../context/OrdersContext';

const { width } = Dimensions.get('window');

interface FacilityStats {
  totalFacilities: number;
  activeOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

type QuickAction = {
  title: string;
  subtitle: string;
  icon: keyof typeof FontAwesome.glyphMap;
  iconBackground: string;
  iconColor: string;
  href: Href;
  mode: 'tab' | 'stack';
};

type ActivityType = 'order' | 'facility';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  iconBackground: string;
  iconColor: string;
  icon: keyof typeof FontAwesome.glyphMap;
  href: Href;
  mode: 'tab' | 'stack';
}

export default function FacilityDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { orders, refreshOrders } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FacilityStats>({
    totalFacilities: 0,
    activeOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [myFacilities, setMyFacilities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const quickActions = [
    {
      title: 'Facilities',
      subtitle: 'Add or update',
      icon: 'hospital-o',
      iconBackground: '#f1e4ff',
      iconColor: '#8e44ad',
      href: '/(facility-tabs)/facilities',
      mode: 'tab',
    },
    {
      title: 'Orders',
      subtitle: 'Track status',
      icon: 'list',
      iconBackground: '#e6f2ff',
      iconColor: '#2980b9',
      href: '/(facility-tabs)/orders',
      mode: 'tab',
    },
    {
      title: 'Messages',
      subtitle: 'Chat with staff',
      icon: 'comments',
      iconBackground: '#e4fbf5',
      iconColor: '#16a085',
      href: '/(facility-tabs)/chat',
      mode: 'tab',
    },
    {
      title: 'Notifications',
      subtitle: 'Alerts & updates',
      icon: 'bell',
      iconBackground: '#fff2e0',
      iconColor: '#d35400',
      href: '/(facility-tabs)/notifications',
      mode: 'tab',
    },
    {
      title: 'Add Facility',
      subtitle: 'Register new',
      icon: 'plus',
      iconBackground: '#ffe7e7',
      iconColor: '#c0392b',
      href: '/pharmacy-registration',
      mode: 'stack',
    },
  ] satisfies QuickAction[];

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update stats when orders change
  useEffect(() => {
    calculateStats();
  }, [orders]);

  useEffect(() => {
    buildRecentActivities();
  }, [orders, myFacilities]);

  const calculateStats = () => {
    if (!orders || orders.length === 0) {
      setStats(prev => ({
        ...prev,
        activeOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
      }));
      return;
    }

    // Calculate pending orders
    const pending = orders.filter(order => order.status === 'pending').length;
    
    // Calculate active orders (all orders except delivered and cancelled)
    const active = orders.filter(order => 
      order.status !== 'delivered' && order.status !== 'cancelled'
    ).length;
    
    // Calculate total revenue from delivered orders
    const revenue = orders
      .filter(order => order.status === 'delivered')
      .reduce((sum, order) => sum + (order.final_amount || 0), 0);

    setStats(prev => ({
      ...prev,
      activeOrders: active,
      pendingOrders: pending,
      totalRevenue: revenue,
    }));
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load user's facilities
      const facilitiesResponse = await facilitiesService.getMyFacilities();
      if (facilitiesResponse.success && facilitiesResponse.data) {
        setMyFacilities(facilitiesResponse.data);
        setStats(prev => ({
          ...prev,
          totalFacilities: facilitiesResponse.data?.length || 0,
        }));
      }
      
      // Load orders
      await refreshOrders();
      
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const buildRecentActivities = () => {
    const activities: ActivityItem[] = [];

    if (orders && orders.length > 0) {
      orders.slice(0, 5).forEach((order) => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `Order ${order.order_number || order.id}`,
          description: `Status: ${formatStatus(order.status)}`,
          timestamp: order.updated_at || order.created_at,
          iconBackground: '#e8f1ff',
          iconColor: '#2980b9',
          icon: 'shopping-cart',
          href: '/(facility-tabs)/orders',
          mode: 'tab',
        });
      });
    }

    if (myFacilities && myFacilities.length > 0) {
      myFacilities.slice(0, 5).forEach((facility) => {
        activities.push({
          id: `facility-${facility.id}`,
          type: 'facility',
          title: facility.name,
          description: `Facility • ${formatStatus(facility.facility_type)}`,
          timestamp: facility.updated_at || facility.created_at || new Date().toISOString(),
          iconBackground: '#f3e5f5',
          iconColor: '#8e44ad',
          icon: 'building',
          href: '/(facility-tabs)/facilities',
          mode: 'tab',
        });
      });
    }

    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    setRecentActivities(activities.slice(0, 6));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), refreshOrders()]);
    setRefreshing(false);
  };

  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9b59b6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <LinearGradient
        colors={['#9b59b6', '#8e44ad']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>{user?.firstName || 'Facility Admin'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(facility-tabs)/notifications')}
          >
            <FontAwesome name="bell" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#e8d5f2' }]}>
            <FontAwesome name="building" size={24} color="#9b59b6" />
          </View>
          <Text style={styles.statValue}>{stats.totalFacilities}</Text>
          <Text style={styles.statLabel}>Facilities</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#ffe5e5' }]}>
            <FontAwesome name="shopping-cart" size={24} color="#e74c3c" />
          </View>
          <Text style={styles.statValue}>{stats.activeOrders}</Text>
          <Text style={styles.statLabel}>Active Orders</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#fff3cd' }]}>
            <FontAwesome name="clock-o" size={24} color="#f39c12" />
          </View>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsRow}
        >
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.title}
              style={[
                styles.actionCard,
                index === quickActions.length - 1 && { marginRight: 20 },
              ]}
              onPress={() => {
                if (action.mode === 'tab') {
                  router.navigate(action.href);
                } else {
                  router.push(action.href);
                }
              }}
              activeOpacity={0.9}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: action.iconBackground },
                ]}
              >
                <FontAwesome
                  name={action.icon}
                  size={20}
                  color={action.iconColor}
                />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>Open</Text>
                <FontAwesome name="chevron-right" size={10} color="#6c5ce7" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* My Facilities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Facilities</Text>
          <TouchableOpacity onPress={() => router.push('/(facility-tabs)/facilities')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {myFacilities.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="building-o" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No facilities yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/pharmacy-registration')}
            >
              <Text style={styles.addButtonText}>Add Facility</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {myFacilities.slice(0, 5).map((facility) => (
              <TouchableOpacity
                key={facility.id}
                style={styles.facilityCard}
                onPress={() => router.push({
                  pathname: facility.facility_type === 'pharmacy' ? '/pharmacy-details-modal' : '/hospital-details-modal',
                  params: { id: facility.id }
                })}
              >
                <View style={styles.facilityIcon}>
                  <FontAwesome
                    name={facility.facility_type === 'pharmacy' ? 'medkit' : 'hospital-o'}
                    size={24}
                    color="#9b59b6"
                  />
                </View>
                <Text style={styles.facilityName} numberOfLines={1}>
                  {facility.name}
                </Text>
                <Text style={styles.facilityType}>
                  {facility.facility_type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {recentActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => {
                  if (activity.mode === 'tab') {
                    router.navigate(activity.href);
                  } else {
                    router.push(activity.href);
                  }
                }}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: activity.iconBackground },
                  ]}
                >
                  <FontAwesome name={activity.icon} size={18} color={activity.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                  </View>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  section: {
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
    color: '#2c3e50',
  },
  seeAllText: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
  },
  actionCard: {
    width: 150,
    padding: 14,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  actionsRow: {
    paddingVertical: 4,
    paddingRight: 20,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    marginBottom: 16,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f2ecff',
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6c5ce7',
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  activityTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  activityDescription: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  facilityCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  facilityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  facilityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  facilityType: {
    fontSize: 12,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#fee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
});

