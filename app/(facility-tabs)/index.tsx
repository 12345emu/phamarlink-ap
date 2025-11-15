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
import { useRouter } from 'expo-router';
import { facilitiesService } from '../../services/facilitiesService';
import { useOrders } from '../../context/OrdersContext';

const { width } = Dimensions.get('window');

interface FacilityStats {
  totalFacilities: number;
  activeOrders: number;
  pendingOrders: number;
  totalRevenue: number;
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update stats when orders change
  useEffect(() => {
    calculateStats();
  }, [orders]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), refreshOrders()]);
    setRefreshing(false);
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
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(facility-tabs)/facilities')}
          >
            <LinearGradient
              colors={['#9b59b6', '#8e44ad']}
              style={styles.actionGradient}
            >
              <FontAwesome name="hospital-o" size={32} color="#fff" />
              <Text style={styles.actionText}>Manage Facilities</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(facility-tabs)/orders')}
          >
            <LinearGradient
              colors={['#3498db', '#2980b9']}
              style={styles.actionGradient}
            >
              <FontAwesome name="list" size={32} color="#fff" />
              <Text style={styles.actionText}>View Orders</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
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

