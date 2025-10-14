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
import { doctorDashboardService } from '../../services/doctorDashboardService';
import { DashboardStats, DashboardData } from '../../services/dashboardService';

const { width } = Dimensions.get('window');

// Remove duplicate interface - now imported from dashboardService

export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalPatients: 0,
    pendingPrescriptions: 0,
    unreadMessages: 0,
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 DoctorDashboard - Loading dashboard data');
      console.log('🔍 DoctorDashboard - Current user:', JSON.stringify(user, null, 2));
      console.log('🔍 DoctorDashboard - User ID:', user?.id, 'Type:', typeof user?.id);
      console.log('🔍 DoctorDashboard - User role:', user?.role);
      
      const data = await doctorDashboardService.getDashboardData();
      setDashboardData(data);
      setStats(data.stats);
      
      // Load recent activities
      const activitiesData = await doctorDashboardService.getRecentActivities(5);
      setRecentActivities(activitiesData.activities || []);
      
      console.log('✅ DoctorDashboard - Dashboard data loaded:', data);
      console.log('✅ DoctorDashboard - Recent activities loaded:', activitiesData.activities?.length || 0);
    } catch (error) {
      console.error('❌ DoctorDashboard - Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      
      // Fallback to mock data on error
      setStats({
        todayAppointments: 0,
        totalPatients: 0,
        pendingPrescriptions: 0,
        unreadMessages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return activityTime.toLocaleDateString();
  };

  const quickActions = [
    {
      id: 'appointments',
      title: 'My Appointments',
      icon: 'calendar',
      color: '#3498db',
      count: stats.todayAppointments,
      onPress: () => router.push('/(doctor-tabs)/appointments'),
    },
    {
      id: 'patients',
      title: 'My Patients',
      icon: 'users',
      color: '#2ecc71',
      count: stats.totalPatients,
      onPress: () => router.push('/(doctor-tabs)/patients'),
    },
    {
      id: 'prescriptions',
      title: 'Prescriptions',
      icon: 'file-text-o',
      color: '#e74c3c',
      count: stats.pendingPrescriptions,
      onPress: () => router.push('/(doctor-tabs)/prescriptions'),
    },
    {
      id: 'chat',
      title: 'Patient Messages',
      icon: 'comments',
      color: '#f39c12',
      count: stats.unreadMessages,
      onPress: () => router.push('/(doctor-tabs)/chat'),
    },
  ];

  // Use real data from dashboardData or fallback to empty array
  const upcomingAppointments = dashboardData?.upcomingAppointments || [];

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
        <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <LinearGradient
        colors={['#3498db', '#2980b9']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.doctorName}>Dr. {user?.firstName} {user?.lastName}</Text>
            <Text style={styles.specialty}>General Practitioner</Text>
          </View>
          <View style={styles.headerIcon}>
            <FontAwesome name="stethoscope" size={40} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        <View style={styles.statsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.statCard, { borderLeftColor: action.color }]}
              onPress={action.onPress}
            >
              <View style={styles.statContent}>
                <FontAwesome name={action.icon as any} size={24} color={action.color} />
                <Text style={styles.statNumber}>{action.count}</Text>
                <Text style={styles.statLabel}>{action.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              <FontAwesome name={action.icon as any} size={28} color="#fff" />
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.appointmentsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Appointments</Text>
          <TouchableOpacity onPress={() => router.push('/(doctor-tabs)/appointments')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map((appointment) => (
            <TouchableOpacity 
              key={appointment.id} 
              style={styles.appointmentCard}
              onPress={() => router.push(`/appointment-details?appointmentId=${appointment.id}`)}
            >
              <View style={styles.appointmentInfo}>
                <Text style={styles.patientName}>
                  {appointment.patient_first_name} {appointment.patient_last_name}
                </Text>
                <Text style={styles.appointmentType}>{appointment.appointment_type}</Text>
              </View>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>{appointment.appointment_time}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: appointment.status === 'confirmed' ? '#2ecc71' : '#f39c12' }
                ]}>
                  <Text style={styles.statusText}>
                    {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome name="calendar" size={32} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
          </View>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <FontAwesome name={activity.icon} size={16} color={activity.color} />
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivityState}>
              <FontAwesome name="clock-o" size={32} color="#bdc3c7" />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to prevent content from being hidden behind tabs
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  doctorName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  specialty: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 50) / 2,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  appointmentsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  appointmentType: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  activityContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 80, // Increased padding to ensure content is visible above tabs
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 10,
  },
  activityTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 12,
  },
  emptyActivityState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
  },
});
