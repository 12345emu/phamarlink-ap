import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from '../constants/API';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// API Client Class
class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // Setup request and response interceptors
  private setupInterceptors() {
      // Request interceptor - add auth token
  this.client.interceptors.request.use(
    async (config: any) => {
      const token = await this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              // Retry failed requests
              this.failedQueue.forEach(({ resolve }) => {
                resolve();
              });
              this.failedQueue = [];
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Clear failed queue
            this.failedQueue.forEach(({ reject }) => {
              reject(refreshError);
            });
            this.failedQueue = [];
            
            // Redirect to login
            await this.handleAuthFailure();
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Get auth token from storage
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Refresh auth token
  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem('userToken', response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
        return response.data.data.token;
      }

      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  // Handle authentication failure
  private async handleAuthFailure() {
    try {
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
      // You can emit an event here to notify the app to redirect to login
      // For now, we'll just clear the storage
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client(config);
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  // Handle API errors
  private handleError(error: AxiosError): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      return {
        success: false,
        message: data?.message || this.getErrorMessage(status),
        error: data?.error || 'API Error',
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        message: ERROR_MESSAGES.NETWORK_ERROR,
        error: 'Network Error',
      };
    } else {
      // Other error
      return {
        success: false,
        message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
        error: 'Unknown Error',
      };
    }
  }

  // Get error message based on status code
  private getErrorMessage(status: number): string {
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return ERROR_MESSAGES.VALIDATION_ERROR;
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_MESSAGES.FORBIDDEN;
      case HTTP_STATUS.NOT_FOUND:
        return ERROR_MESSAGES.NOT_FOUND;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return ERROR_MESSAGES.SERVER_ERROR;
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...(config || {}), method: 'GET', url });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...(config || {}), method: 'POST', url, data });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...(config || {}), method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...(config || {}), method: 'PATCH', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...(config || {}), method: 'DELETE', url });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/utils/health');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  // Update base URL (useful for switching between dev/prod)
  updateBaseURL(newBaseURL: string) {
    this.client.defaults.baseURL = newBaseURL;
  }
}

// Export singleton instance
export const apiClient = new ApiClient(); 