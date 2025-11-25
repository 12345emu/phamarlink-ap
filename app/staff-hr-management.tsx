import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Switch,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { professionalsService } from '../services/professionalsService';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../constants/API';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  isVerified: boolean;
  profileImage?: string;
}

type TabType = 'overview' | 'schedule' | 'attendance' | 'leave' | 'performance' | 'documents' | 'tasks' | 'notes';

export default function StaffHRManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const staffId = params.staffId as string;
  const facilityId = params.facilityId as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Schedule state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 'monday',
    startTime: new Date(),
    endTime: new Date(),
    breakDuration: 30,
  });

  // Attendance state
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Leave state
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any>({});
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'vacation',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });

  // Performance state
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([]);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    loadStaffData();
  }, [staffId]);

  const loadStaffData = async () => {
    try {
      setLoading(true);
      const response = await professionalsService.getProfessionalById(parseInt(staffId));
      if (response.success && response.data) {
        const prof = response.data;
        setStaff({
          id: prof.id,
          firstName: prof.first_name || prof.firstName,
          lastName: prof.last_name || prof.lastName,
          email: prof.email,
          phone: prof.phone || '',
          specialty: prof.specialty || '',
          licenseNumber: prof.license_number || prof.licenseNumber || '',
          isVerified: prof.is_verified || prof.isVerified || false,
          profileImage: prof.profile_image || null,
        });
      }
      await loadAllHRData();
    } catch (error) {
      console.error('Error loading staff data:', error);
      Alert.alert('Error', 'Failed to load staff information');
    } finally {
      setLoading(false);
    }
  };

  const loadAllHRData = async () => {
    try {
      // Load schedules, attendance, leave, performance, documents, tasks, notes
      // These will be implemented with API calls
      await Promise.all([
        loadSchedules(),
        loadAttendance(),
        loadLeaveRequests(),
        loadLeaveBalances(),
        loadPerformanceReviews(),
        loadDocuments(),
        loadTasks(),
        loadNotes(),
      ]);
    } catch (error) {
      console.error('Error loading HR data:', error);
    }
  };

  const loadSchedules = async () => {
    // TODO: Implement API call
    setSchedules([]);
  };

  const loadAttendance = async () => {
    // TODO: Implement API call
    setAttendance([]);
  };

  const loadLeaveRequests = async () => {
    // TODO: Implement API call
    setLeaveRequests([]);
  };

  const loadLeaveBalances = async () => {
    // TODO: Implement API call
    setLeaveBalances({});
  };

  const loadPerformanceReviews = async () => {
    // TODO: Implement API call
    setPerformanceReviews([]);
  };

  const loadDocuments = async () => {
    // TODO: Implement API call
    setDocuments([]);
  };

  const loadTasks = async () => {
    // TODO: Implement API call
    setTasks([]);
  };

  const loadNotes = async () => {
    // TODO: Implement API call
    setNotes([]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllHRData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9b59b6" />
        <Text style={styles.loadingText}>Loading staff information...</Text>
      </View>
    );
  }

  if (!staff) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Staff member not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#9b59b6', '#8e44ad']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {staff.profileImage ? (
              <Image source={{ uri: staff.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <FontAwesome name="user-md" size={24} color="#9b59b6" />
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{staff.firstName} {staff.lastName}</Text>
              <Text style={styles.headerRole}>{staff.specialty}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'user' },
          { key: 'schedule', label: 'Schedule', icon: 'calendar' },
          { key: 'attendance', label: 'Attendance', icon: 'clock-o' },
          { key: 'leave', label: 'Leave', icon: 'calendar-check-o' },
          { key: 'performance', label: 'Performance', icon: 'star' },
          { key: 'documents', label: 'Documents', icon: 'file-text' },
          { key: 'tasks', label: 'Tasks', icon: 'tasks' },
          { key: 'notes', label: 'Notes', icon: 'sticky-note' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <FontAwesome
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#9b59b6' : '#7f8c8d'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        {activeTab === 'overview' && <OverviewTab staff={staff} />}
        {activeTab === 'schedule' && <ScheduleTab schedules={schedules} onAddSchedule={() => setShowScheduleModal(true)} />}
        {activeTab === 'attendance' && <AttendanceTab attendance={attendance} selectedDate={selectedDate} onDateChange={setSelectedDate} />}
        {activeTab === 'leave' && <LeaveTab leaveRequests={leaveRequests} leaveBalances={leaveBalances} onAddLeave={() => setShowLeaveModal(true)} />}
        {activeTab === 'performance' && <PerformanceTab reviews={performanceReviews} onAddReview={() => setShowPerformanceModal(true)} />}
        {activeTab === 'documents' && <DocumentsTab documents={documents} staffId={staff.id} facilityId={facilityId} />}
        {activeTab === 'tasks' && <TasksTab tasks={tasks} onAddTask={() => setShowTaskModal(true)} />}
        {activeTab === 'notes' && <NotesTab notes={notes} onAddNote={() => setShowNoteModal(true)} />}
      </ScrollView>

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleModal
          visible={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSave={async (schedule) => {
            // TODO: Save schedule
            setShowScheduleModal(false);
            await loadSchedules();
          }}
        />
      )}
    </View>
  );
}

// Tab Components
function OverviewTab({ staff }: { staff: StaffMember }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Email" value={staff.email} icon="envelope" />
          <InfoRow label="Phone" value={staff.phone} icon="phone" />
          <InfoRow label="Specialty" value={staff.specialty} icon="briefcase" />
          <InfoRow label="License Number" value={staff.licenseNumber} icon="id-card" />
          <InfoRow label="Status" value={staff.isVerified ? 'Verified' : 'Pending'} icon="check-circle" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard label="This Month" value="22" sublabel="Days Worked" icon="calendar" />
          <StatCard label="Attendance" value="95%" sublabel="Rate" icon="check-circle" />
          <StatCard label="Leave Balance" value="12" sublabel="Days" icon="calendar-check-o" />
          <StatCard label="Performance" value="4.5" sublabel="Rating" icon="star" />
        </View>
      </View>
    </View>
  );
}

function ScheduleTab({ schedules, onAddSchedule }: { schedules: any[]; onAddSchedule: () => void }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddSchedule}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {schedules.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="calendar" size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>No schedule set</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAddSchedule}>
            <Text style={styles.emptyButtonText}>Create Schedule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scheduleList}>
          {days.map((day) => {
            const schedule = schedules.find(s => s.day_of_week === day.toLowerCase());
            return (
              <View key={day} style={styles.scheduleItem}>
                <Text style={styles.scheduleDay}>{day}</Text>
                {schedule ? (
                  <View style={styles.scheduleTime}>
                    <Text style={styles.scheduleTimeText}>
                      {schedule.start_time} - {schedule.end_time}
                    </Text>
                    {schedule.break_duration > 0 && (
                      <Text style={styles.scheduleBreak}>Break: {schedule.break_duration} min</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.scheduleOff}>Off</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function AttendanceTab({ attendance, selectedDate, onDateChange }: any) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Attendance Records</Text>
      <View style={styles.emptyState}>
        <FontAwesome name="clock-o" size={48} color="#bdc3c7" />
        <Text style={styles.emptyText}>Attendance tracking coming soon</Text>
      </View>
    </View>
  );
}

function LeaveTab({ leaveRequests, leaveBalances, onAddLeave }: any) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Leave Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddLeave}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.addButtonText}>Request</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.leaveBalances}>
        <Text style={styles.subsectionTitle}>Leave Balances</Text>
        <View style={styles.balanceGrid}>
          <BalanceCard type="Vacation" total={20} used={8} remaining={12} />
          <BalanceCard type="Sick" total={10} used={2} remaining={8} />
          <BalanceCard type="Personal" total={5} used={1} remaining={4} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>Recent Requests</Text>
        {leaveRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No leave requests</Text>
          </View>
        ) : (
          <View style={styles.leaveList}>
            {leaveRequests.map((request) => (
              <LeaveRequestCard key={request.id} request={request} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function PerformanceTab({ reviews, onAddReview }: any) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance Reviews</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddReview}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.addButtonText}>Add Review</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.emptyState}>
        <FontAwesome name="star" size={48} color="#bdc3c7" />
        <Text style={styles.emptyText}>Performance reviews coming soon</Text>
      </View>
    </View>
  );
}

function DocumentsTab({ documents, staffId, facilityId }: any) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Documents</Text>
      <View style={styles.emptyState}>
        <FontAwesome name="file-text" size={48} color="#bdc3c7" />
        <Text style={styles.emptyText}>Document management coming soon</Text>
      </View>
    </View>
  );
}

function TasksTab({ tasks, onAddTask }: any) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tasks & Assignments</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddTask}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.addButtonText}>Assign</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.emptyState}>
        <FontAwesome name="tasks" size={48} color="#bdc3c7" />
        <Text style={styles.emptyText}>Task management coming soon</Text>
      </View>
    </View>
  );
}

function NotesTab({ notes, onAddNote }: any) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Staff Notes</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddNote}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.addButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.emptyState}>
        <FontAwesome name="sticky-note" size={48} color="#bdc3c7" />
        <Text style={styles.emptyText}>Notes management coming soon</Text>
      </View>
    </View>
  );
}

// Helper Components
function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.infoRow}>
      <FontAwesome name={icon as any} size={16} color="#9b59b6" style={styles.infoIcon} />
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoText}>{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, sublabel, icon }: { label: string; value: string; sublabel: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <FontAwesome name={icon as any} size={20} color="#9b59b6" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSublabel}>{sublabel}</Text>
    </View>
  );
}

function BalanceCard({ type, total, used, remaining }: { type: string; total: number; used: number; remaining: number }) {
  return (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceType}>{type}</Text>
      <Text style={styles.balanceTotal}>Total: {total}</Text>
      <Text style={styles.balanceUsed}>Used: {used}</Text>
      <Text style={styles.balanceRemaining}>Remaining: {remaining}</Text>
    </View>
  );
}

function LeaveRequestCard({ request }: { request: any }) {
  return (
    <View style={styles.leaveRequestCard}>
      <View style={styles.leaveRequestHeader}>
        <Text style={styles.leaveRequestType}>{request.leave_type}</Text>
        <Text style={styles.leaveRequestStatus}>{request.status}</Text>
      </View>
      <Text style={styles.leaveRequestDates}>
        {request.start_date} - {request.end_date}
      </Text>
      <Text style={styles.leaveRequestReason}>{request.reason}</Text>
    </View>
  );
}

function ScheduleModal({ visible, onClose, onSave }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Schedule</Text>
          <Text style={styles.comingSoonText}>Schedule management coming soon</Text>
          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Styles
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
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#9b59b6',
  },
  tabLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#9b59b6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
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
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 24,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  statSublabel: {
    fontSize: 10,
    color: '#95a5a6',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9b59b6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 12,
  },
  emptyButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleList: {
    gap: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  scheduleTime: {
    alignItems: 'flex-end',
  },
  scheduleTimeText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  scheduleBreak: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  scheduleOff: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  leaveBalances: {
    marginBottom: 24,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
  },
  balanceType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  balanceTotal: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  balanceUsed: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  balanceRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    marginTop: 4,
  },
  leaveList: {
    gap: 12,
  },
  leaveRequestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  leaveRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leaveRequestType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  leaveRequestStatus: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#ecf0f1',
    color: '#2c3e50',
  },
  leaveRequestDates: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  leaveRequestReason: {
    fontSize: 14,
    color: '#2c3e50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

