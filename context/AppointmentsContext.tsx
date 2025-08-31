import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { appointmentsService } from '../services/appointmentsService';
import { useAuth } from './AuthContext';

export interface Appointment {
  id: number;
  user_id: number;
  facility_id: number;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  reason: string;
  symptoms: string[];
  preferred_doctor?: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'no_show';
  created_at: string;
  updated_at: string;
  facility_name?: string;
  doctor_name?: string;
  facility_phone?: string;
  facility_email?: string;
  // Additional fields for display
  hospitalName?: string;
  doctorName?: string;
  specialty?: string;
  hospitalImage?: string;
}

interface AppointmentsContextType {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: any) => Promise<void>;
  updateAppointmentStatus: (id: number, status: Appointment['status']) => Promise<void>;
  cancelAppointment: (id: number) => Promise<void>;
  rescheduleAppointment: (id: number, newDate: string, newTime: string) => Promise<void>;
  refreshAppointments: () => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export const useAppointments = () => {
  const context = useContext(AppointmentsContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentsProvider');
  }
  return context;
};

interface AppointmentsProviderProps {
  children: ReactNode;
}

export const AppointmentsProvider: React.FC<AppointmentsProviderProps> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Fetch appointments from API
  const fetchAppointments = async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await appointmentsService.getAppointments();
      
      // Transform the data to include display fields
      const transformedAppointments = response.appointments.map((apt: any) => ({
        ...apt,
        hospitalName: apt.facility_name || 'Unknown Facility',
        doctorName: apt.doctor_name || 'General Consultation',
        specialty: apt.appointment_type || 'General',
        hospitalImage: 'https://via.placeholder.com/50x50/3498db/ffffff?text=H', // Default image
      }));
      
      setAppointments(transformedAppointments);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  // Add new appointment
  const addAppointment = async (appointmentData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await appointmentsService.createAppointment(appointmentData);
      
      // Refresh the appointments list
      await fetchAppointments();
    } catch (error: any) {
      setError(error.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async (id: number, status: Appointment['status']) => {
    try {
      setLoading(true);
      setError(null);
      
      await appointmentsService.updateAppointmentStatus(id, status);
      
      // Refresh the appointments list
      await fetchAppointments();
    } catch (error: any) {
      setError(error.message || 'Failed to update appointment status');
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      await appointmentsService.cancelAppointment(id);
      
      // Refresh the appointments list
      await fetchAppointments();
    } catch (error: any) {
      setError(error.message || 'Failed to cancel appointment');
      // Re-throw the error so the calling function can handle it
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reschedule appointment
  const rescheduleAppointment = async (id: number, newDate: string, newTime: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await appointmentsService.rescheduleAppointment(id, newDate, newTime);
      
      // Refresh the appointments list
      await fetchAppointments();
    } catch (error: any) {
      setError(error.message || 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  // Refresh appointments
  const refreshAppointments = async () => {
    await fetchAppointments();
  };

  // Fetch appointments when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAppointments();
    } else {
      setAppointments([]);
    }
  }, [isAuthenticated, user]);

  const value: AppointmentsContextType = {
    appointments,
    loading,
    error,
    fetchAppointments,
    addAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    rescheduleAppointment,
    refreshAppointments,
  };

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}; 