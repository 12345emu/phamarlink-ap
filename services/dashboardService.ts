import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

interface ApiResponse {
  success: boolean;
  data?: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
  error?: string;
}

export interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  pendingPrescriptions: number;
  unreadMessages: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcomingAppointments: any[];
  recentPatients: any[];
  recentPrescriptions: any[];
}

class DashboardService {
  /**
   * Get dashboard statistics for a doctor
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      console.log('🔍 DashboardService - Fetching dashboard stats');
      
      const [appointmentsResponse, patientsResponse, prescriptionsResponse, messagesResponse] = await Promise.all([
        this.getTodayAppointmentsCount(),
        this.getTotalPatientsCount(),
        this.getPendingPrescriptionsCount(),
        this.getUnreadMessagesCount()
      ]);

      const stats: DashboardStats = {
        todayAppointments: appointmentsResponse,
        totalPatients: patientsResponse,
        pendingPrescriptions: prescriptionsResponse,
        unreadMessages: messagesResponse
      };

      console.log('✅ DashboardService - Dashboard stats fetched:', stats);
      return stats;
    } catch (error) {
      console.error('❌ DashboardService - Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get all appointments count for the logged-in doctor (no date or status restrictions)
   */
  private async getTodayAppointmentsCount(): Promise<number> {
    try {
      console.log('🔍 DashboardService - Fetching appointments count...');
      
      const response = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS.LIST}`, {
        params: {
          // Get more appointments to see the actual count
          limit: 100
        }
      });

      console.log('🔍 DashboardService - Full API Response:', JSON.stringify(response, null, 2));
      console.log('🔍 DashboardService - Response data type:', typeof response.data);
      console.log('🔍 DashboardService - Response data keys:', Object.keys(response.data || {}));
      
      const data = response.data as any;
      if (data.success) {
        console.log('🔍 DashboardService - Success, pagination total:', data.data?.pagination?.total);
        console.log('🔍 DashboardService - Data structure:', {
          hasData: !!data.data,
          hasPagination: !!data.data?.pagination,
          total: data.data?.pagination?.total
        });
        // For doctors, this will now return all appointments where they are the preferred doctor
        return data.data?.pagination?.total || 0;
      }
      
      console.log('🔍 DashboardService - API returned unsuccessful response');
      return 0;
    } catch (error) {
      console.error('❌ DashboardService - Error fetching appointments count:', error);
      return 0;
    }
  }

  /**
   * Get total patients count
   */
  private async getTotalPatientsCount(): Promise<number> {
    try {
      // Get patients from appointments (unique user_ids)
      const response = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS.LIST}`, {
        params: {
          limit: 100
        }
      });

      const data = response.data as any;
      if (data.success) {
        // Count unique patients from appointments
        const appointments = data.data?.appointments || [];
        const uniquePatients = new Set(appointments.map((apt: any) => apt.user_id));
        return uniquePatients.size;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ DashboardService - Error fetching total patients count:', error);
      return 0;
    }
  }

  /**
   * Get pending prescriptions count
   */
  private async getPendingPrescriptionsCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.PRESCRIPTIONS.LIST}`, {
        params: {
          status: 'pending',
          limit: 100
        }
      });

      const data = response.data as any;
      if (data.success) {
        return data.data?.pagination?.total || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ DashboardService - Error fetching pending prescriptions count:', error);
      return 0;
    }
  }

  /**
   * Get unread messages count
   */
  private async getUnreadMessagesCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.CHAT.CONVERSATIONS}`);

      const data = response.data as any;
      if (data.success) {
        const conversations = data.data || [];
        let unreadCount = 0;
        
        // Count unread messages across all conversations
        for (const conversation of conversations) {
          if (conversation.unread_count) {
            unreadCount += conversation.unread_count;
          }
        }
        
        return unreadCount;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ DashboardService - Error fetching unread messages count:', error);
      return 0;
    }
  }

  /**
   * Get all appointments for dashboard (filtered by preferred doctor, no date restrictions)
   */
  async getUpcomingAppointments(limit: number = 5): Promise<any[]> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS.LIST}`, {
        params: {
          // Remove all date and status filters to show all appointments
          limit: limit,
          sort: 'appointment_date',
          order: 'asc'
        }
      });

      const data = response.data as any;
      if (data.success) {
        // For doctors, this will now return all appointments where they are the preferred doctor
        return data.data?.appointments || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ DashboardService - Error fetching appointments:', error);
      return [];
    }
  }

  /**
   * Get recent patients for dashboard (filtered by preferred doctor)
   */
  async getRecentPatients(limit: number = 5): Promise<any[]> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS.LIST}`, {
        params: {
          limit: limit,
          sort: 'created_at',
          order: 'desc'
        }
      });

      const data = response.data as any;
      if (data.success) {
        const appointments = data.data?.appointments || [];
        // Extract unique patients with their latest appointment info
        // For doctors, this will now return appointments where they are the preferred doctor
        const patientMap = new Map();
        
        appointments.forEach((apt: any) => {
          if (!patientMap.has(apt.user_id)) {
            patientMap.set(apt.user_id, {
              id: apt.user_id,
              name: `${apt.first_name} ${apt.last_name}`,
              lastAppointment: apt.appointment_date,
              status: apt.status
            });
          }
        });
        
        return Array.from(patientMap.values());
      }
      
      return [];
    } catch (error) {
      console.error('❌ DashboardService - Error fetching recent patients:', error);
      return [];
    }
  }

  /**
   * Get recent prescriptions for dashboard
   */
  async getRecentPrescriptions(limit: number = 5): Promise<any[]> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.PRESCRIPTIONS.LIST}`, {
        params: {
          limit: limit,
          sort: 'created_at',
          order: 'desc'
        }
      });

      const data = response.data as any;
      if (data.success) {
        return data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ DashboardService - Error fetching recent prescriptions:', error);
      return [];
    }
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      console.log('🔍 DashboardService - Fetching complete dashboard data');
      
      const [stats, upcomingAppointments, recentPatients, recentPrescriptions] = await Promise.all([
        this.getDashboardStats(),
        this.getUpcomingAppointments(5),
        this.getRecentPatients(5),
        this.getRecentPrescriptions(5)
      ]);

      const dashboardData: DashboardData = {
        stats,
        upcomingAppointments,
        recentPatients,
        recentPrescriptions
      };

      console.log('✅ DashboardService - Complete dashboard data fetched:', dashboardData);
      return dashboardData;
    } catch (error) {
      console.error('❌ DashboardService - Error fetching complete dashboard data:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
