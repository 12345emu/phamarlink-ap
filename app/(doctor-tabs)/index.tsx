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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  pendingPrescriptions: number;
  unreadMessages: number;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalPatients: 0,
    pendingPrescriptions: 0,
    unreadMessages: 0,
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Replace with actual API calls
    setStats({
      todayAppointments: 8,
      totalPatients: 156,
      pendingPrescriptions: 3,
      unreadMessages: 12,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const quickActions = [
    {
      id: 'appointments',
      title: 'Today\'s Appointments',
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

  const upcomingAppointments = [
    {
      id: 1,
      patientName: 'John Doe',
      time: '09:00 AM',
      type: 'Consultation',
      status: 'confirmed',
    },
    {
      id: 2,
      patientName: 'Jane Smith',
      time: '10:30 AM',
      type: 'Follow-up',
      status: 'confirmed',
    },
    {
      id: 3,
      patientName: 'Mike Johnson',
      time: '02:00 PM',
      type: 'Check-up',
      status: 'pending',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
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
        <Text style={styles.sectionTitle}>Today's Overview</Text>
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
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => router.push('/(doctor-tabs)/appointments')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingAppointments.map((appointment) => (
          <View key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.appointmentInfo}>
              <Text style={styles.patientName}>{appointment.patientName}</Text>
              <Text style={styles.appointmentType}>{appointment.type}</Text>
            </View>
            <View style={styles.appointmentTime}>
              <Text style={styles.timeText}>{appointment.time}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: appointment.status === 'confirmed' ? '#2ecc71' : '#f39c12' }
              ]}>
                <Text style={styles.statusText}>
                  {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <FontAwesome name="file-text-o" size={16} color="#3498db" />
            <Text style={styles.activityText}>Prescription created for John Doe</Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
          <View style={styles.activityItem}>
            <FontAwesome name="comments" size={16} color="#2ecc71" />
            <Text style={styles.activityText}>Message from Jane Smith</Text>
            <Text style={styles.activityTime}>4 hours ago</Text>
          </View>
          <View style={styles.activityItem}>
            <FontAwesome name="calendar" size={16} color="#e74c3c" />
            <Text style={styles.activityText}>Appointment confirmed with Mike Johnson</Text>
            <Text style={styles.activityTime}>1 day ago</Text>
          </View>
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
    paddingBottom: 40,
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
});
