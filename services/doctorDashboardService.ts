import { apiClient } from './apiClient';
import { API_CONFIG } from '../constants/API';

export interface DoctorDashboardStats {
  todayAppointments: number;
  totalPatients: number;
  pendingPrescriptions: number;
  unreadMessages: number;
}

export interface DoctorDashboardData {
  stats: DoctorDashboardStats;
  upcomingAppointments: any[];
  recentPatients: any[];
  recentPrescriptions: any[];
}

class DoctorDashboardService {
  /**
   * Get doctor dashboard stats - SIMPLE VERSION
   */
  async getDashboardStats(): Promise<DoctorDashboardStats> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching dashboard stats from new endpoint');
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/stats`);
      
      console.log('🔍 DoctorDashboardService - API Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Stats fetched:', response.data);
        const data = response.data as any;
        return {
          todayAppointments: data.todayAppointments || 0,
          totalPatients: data.totalPatients || 0,
          pendingPrescriptions: data.pendingPrescriptions || 0,
          unreadMessages: data.unreadMessages || 0
        };
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        todayAppointments: 0,
        totalPatients: 0,
        pendingPrescriptions: 0,
        unreadMessages: 0
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching dashboard stats:', error);
      return {
        todayAppointments: 0,
        totalPatients: 0,
        pendingPrescriptions: 0,
        unreadMessages: 0
      };
    }
  }

  /**
   * Get doctor appointments - SIMPLE VERSION
   */
  async getAppointments(limit: number = 20, page: number = 1): Promise<any[]> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching appointments from new endpoint');
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/appointments`, {
        params: {
          limit,
          page
        }
      });
      
      console.log('🔍 DoctorDashboardService - Appointments response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const data = response.data as any;
        return data.appointments || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching appointments:', error);
      return [];
    }
  }

  /**
   * Get complete dashboard data - SIMPLE VERSION
   */
  async getDashboardData(): Promise<DoctorDashboardData> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching complete dashboard data from new endpoint');
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/dashboard`);
      
      console.log('🔍 DoctorDashboardService - Complete dashboard response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Complete dashboard data fetched:', response.data);
        const data = response.data as any;
        return {
          stats: {
            todayAppointments: data.stats?.todayAppointments || 0,
            totalPatients: data.stats?.totalPatients || 0,
            pendingPrescriptions: data.stats?.pendingPrescriptions || 0,
            unreadMessages: data.stats?.unreadMessages || 0
          },
          upcomingAppointments: data.upcomingAppointments || [],
          recentPatients: data.recentPatients || [],
          recentPrescriptions: data.recentPrescriptions || []
        };
      }
      
      // Fallback to individual calls
      console.log('⚠️ DoctorDashboardService - Using fallback approach');
      const stats = await this.getDashboardStats();
      const appointments = await this.getAppointments(5);
      
      return {
        stats,
        upcomingAppointments: appointments,
        recentPatients: appointments.slice(0, 3),
        recentPrescriptions: []
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching complete dashboard data:', error);
      
      // Return empty data on error
      return {
        stats: {
          todayAppointments: 0,
          totalPatients: 0,
          pendingPrescriptions: 0,
          unreadMessages: 0
        },
        upcomingAppointments: [],
        recentPatients: [],
        recentPrescriptions: []
      };
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: number, status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress'): Promise<boolean> {
    try {
      console.log('🔍 DoctorDashboardService - Updating appointment status:', { appointmentId, status });
      
      const response = await apiClient.put(`${API_CONFIG.BASE_URL}/doctor-dashboard/appointments/${appointmentId}/status`, {
        status: status
      });
      
      console.log('🔍 DoctorDashboardService - Update status response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Appointment status updated successfully');
        return true;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return false;
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error updating appointment status:', error);
      throw error;
    }
  }

  /**
   * Start consultation for an appointment
   */
  async startConsultation(appointmentId: number): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Starting consultation:', { appointmentId });
      
      const response = await apiClient.post(`${API_CONFIG.BASE_URL}/doctor-dashboard/appointments/${appointmentId}/start-consultation`);
      
      console.log('🔍 DoctorDashboardService - Start consultation response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Consultation started successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      throw new Error(response.message || 'Failed to start consultation');
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error starting consultation:', error);
      throw error;
    }
  }

  /**
   * Get doctor's patients
   */
  async getPatients(limit: number = 20, page: number = 1, search: string = '', status: string = 'all'): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching patients:', { limit, page, search, status });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/patients`, {
        params: {
          limit,
          page,
          search,
          status
        }
      });
      
      console.log('🔍 DoctorDashboardService - Patients response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Patients fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        patients: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching patients:', error);
      return {
        patients: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    }
  }

  /**
   * Get patient history
   */
  async getPatientHistory(patientId: number, limit: number = 50, page: number = 1): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching patient history:', { patientId, limit, page });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/patients/${patientId}/history`, {
        params: {
          limit,
          page
        }
      });
      
      console.log('🔍 DoctorDashboardService - Patient history response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Patient history fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      throw new Error(response.message || 'Failed to fetch patient history');
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching patient history:', error);
      throw error;
    }
  }

  /**
   * Create a new prescription
   */
  async createPrescription(prescriptionData: {
    patientId: number;
    appointmentId?: number;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    quantity?: number;
    refills?: number;
  }): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Creating prescription:', prescriptionData);
      
      const response = await apiClient.post(`${API_CONFIG.BASE_URL}/doctor-dashboard/prescriptions`, prescriptionData);
      
      console.log('🔍 DoctorDashboardService - Create prescription response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Prescription created successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      throw new Error(response.message || 'Failed to create prescription');
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error creating prescription:', error);
      throw error;
    }
  }

  /**
   * Get prescriptions for a patient
   */
  async getPatientPrescriptions(patientId: number, limit: number = 20, page: number = 1, status: string = 'all'): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching patient prescriptions:', { patientId, limit, page, status });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/prescriptions/patient/${patientId}`, {
        params: {
          limit,
          page,
          status
        }
      });
      
      console.log('🔍 DoctorDashboardService - Patient prescriptions response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Patient prescriptions fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        prescriptions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching patient prescriptions:', error);
      return {
        prescriptions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    }
  }

  /**
   * Get all prescriptions for the doctor
   */
  async getAllPrescriptions(limit: number = 20, page: number = 1, status: string = 'all', search: string = ''): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching all prescriptions:', { limit, page, status, search });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/prescriptions`, {
        params: {
          limit,
          page,
          status,
          search
        }
      });
      
      console.log('🔍 DoctorDashboardService - All prescriptions response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - All prescriptions fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        prescriptions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching all prescriptions:', error);
      return {
        prescriptions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    }
  }

  /**
   * Update prescription status
   */
  async updatePrescriptionStatus(prescriptionId: number, status: 'active' | 'completed' | 'cancelled'): Promise<boolean> {
    try {
      console.log('🔍 DoctorDashboardService - Updating prescription status:', { prescriptionId, status });
      
      const response = await apiClient.put(`${API_CONFIG.BASE_URL}/doctor-dashboard/prescriptions/${prescriptionId}/status`, {
        status
      });
      
      console.log('🔍 DoctorDashboardService - Update prescription status response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Prescription status updated successfully');
        return true;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return false;
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error updating prescription status:', error);
      throw error;
    }
  }

  /**
   * Get chat messages with a patient
   */
  async getChatMessages(patientId: number, limit: number = 50, page: number = 1): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching chat messages:', { patientId, limit, page });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/chat/messages/${patientId}`, {
        params: {
          limit,
          page
        }
      });
      
      console.log('🔍 DoctorDashboardService - Chat messages response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Chat messages fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        messages: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          pages: 0
        }
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching chat messages:', error);
      return {
        messages: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          pages: 0
        }
      };
    }
  }

  /**
   * Send a chat message to a patient
   */
  async sendChatMessage(patientId: number, message: string): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Sending chat message:', { patientId, message });
      
      const response = await apiClient.post(`${API_CONFIG.BASE_URL}/chat/send`, {
        receiver_id: patientId,
        message: message
      });
      
      console.log('🔍 DoctorDashboardService - Send message response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Message sent successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      throw new Error(response.message || 'Failed to send message');
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get chat conversations list
   */
  async getChatConversations(limit: number = 20, page: number = 1): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching chat conversations:', { limit, page });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/chat/conversations`, {
        params: {
          limit,
          page
        }
      });
      
      console.log('🔍 DoctorDashboardService - Chat conversations response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Chat conversations fetched successfully');
        // Return data in expected format for frontend
        const conversations = response.data as any[];
        return {
          conversations: conversations,
          pagination: {
            total: conversations.length,
            page: 1,
            limit: 20,
            pages: 1
          }
        };
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        conversations: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching chat conversations:', error);
      return {
        conversations: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    }
  }

  /**
   * Add medical notes for a patient
   */
  async addMedicalNote(medicalNoteData: {
    patientId: number;
    appointmentId?: number;
    diagnosis: string;
    symptoms: string;
    treatment: string;
    medications?: string;
    notes?: string;
    followUpDate?: string;
    followUpNotes?: string;
  }): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Adding medical note:', medicalNoteData);
      
      const response = await apiClient.post(`${API_CONFIG.BASE_URL}/doctor-dashboard/medical-notes`, medicalNoteData);
      
      console.log('🔍 DoctorDashboardService - Add medical note response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Medical note added successfully');
        return response;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      throw new Error(response.message || 'Failed to add medical note');
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error adding medical note:', error);
      throw error;
    }
  }

  /**
   * Get medical notes for a patient
   */
  async getPatientMedicalNotes(patientId: number, limit: number = 20, page: number = 1): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching patient medical notes:', { patientId, limit, page });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/medical-notes/patient/${patientId}`, {
        params: {
          limit,
          page
        }
      });
      
      console.log('🔍 DoctorDashboardService - Patient medical notes response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Patient medical notes fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        notes: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching patient medical notes:', error);
      return {
        notes: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0
        }
      };
    }
  }

  /**
   * Update medical note
   */
  async updateMedicalNote(noteId: number, medicalNoteData: {
    diagnosis: string;
    symptoms: string;
    treatment: string;
    medications?: string;
    notes?: string;
    followUpDate?: string;
    followUpNotes?: string;
  }): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Updating medical note:', { noteId, medicalNoteData });
      
      const response = await apiClient.put(`${API_CONFIG.BASE_URL}/doctor-dashboard/medical-notes/${noteId}`, medicalNoteData);
      
      console.log('🔍 DoctorDashboardService - Update medical note response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Medical note updated successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      throw new Error(response.message || 'Failed to update medical note');
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error updating medical note:', error);
      throw error;
    }
  }

  /**
   * Delete medical note
   */
  async deleteMedicalNote(noteId: number): Promise<boolean> {
    try {
      console.log('🔍 DoctorDashboardService - Deleting medical note:', { noteId });
      
      const response = await apiClient.delete(`${API_CONFIG.BASE_URL}/doctor-dashboard/medical-notes/${noteId}`);
      
      console.log('🔍 DoctorDashboardService - Delete medical note response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ DoctorDashboardService - Medical note deleted successfully');
        return true;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return false;
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error deleting medical note:', error);
      throw error;
    }
  }

  /**
   * Get recent activities for doctor dashboard
   */
  async getRecentActivities(limit: number = 10): Promise<any> {
    try {
      console.log('🔍 DoctorDashboardService - Fetching recent activities:', { limit });
      
      const response = await apiClient.get(`${API_CONFIG.BASE_URL}/doctor-dashboard/activities`, {
        params: {
          limit
        }
      });
      
      console.log('🔍 DoctorDashboardService - Recent activities response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ DoctorDashboardService - Recent activities fetched successfully');
        return response.data;
      }
      
      console.log('❌ DoctorDashboardService - API returned unsuccessful response');
      return {
        activities: [],
        total: 0
      };
    } catch (error) {
      console.error('❌ DoctorDashboardService - Error fetching recent activities:', error);
      return {
        activities: [],
        total: 0
      };
    }
  }
}

export const doctorDashboardService = new DoctorDashboardService();
