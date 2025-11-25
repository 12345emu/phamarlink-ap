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
  private onTokenExpiredCallback: (() => void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Let axios handle JSON serialization automatically
      // transformRequest removed to avoid interference with JSON data
    });

    this.setupInterceptors();
  }

  // Set callback for token expiration
  setTokenExpiredCallback(callback: () => void) {
    this.onTokenExpiredCallback = callback;
  }

  // Manually trigger token expiration (for testing)
  triggerTokenExpiration() {
    console.log('🔍 Manually triggering token expiration');
    if (this.onTokenExpiredCallback) {
      this.onTokenExpiredCallback();
    } else {
      console.log('⚠️ No token expired callback set');
    }
  }

  // Setup request and response interceptors
  private setupInterceptors() {
      // Request interceptor - add auth token
  this.client.interceptors.request.use(
    async (config: any) => {
      const token = await this.getAuthToken();
      console.log('🔍 Request interceptor - Token found:', token ? `${token.substring(0, 20)}...` : 'No token');
      console.log('🔍 Request URL:', config.url);
      console.log('🔍 Request method:', config.method);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔍 Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.log('⚠️ No token available for request');
      }
      
      return config;
    },
    (error: any) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

    // Response interceptor - handle token refresh and wrap responses
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // If backend response doesn't have success field, wrap it
        if (response.data && typeof response.data === 'object' && !('success' in response.data)) {
          // Wrap the response in ApiResponse format
          response.data = {
            success: true,
            data: response.data,
          };
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        // Check if the error is due to token expiration (401 Unauthorized)
        if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
          console.log('🔍 Token expired detected, attempting refresh...');
          
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
              console.log('🔍 Token refreshed successfully');
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
            console.log('❌ Token refresh failed, logging out user');
            // Clear failed queue
            this.failedQueue.forEach(({ reject }) => {
              reject(refreshError);
            });
            this.failedQueue = [];
            
            // Handle authentication failure (logout user)
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
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔍 getAuthToken - Retrieved token:', token ? `${token.substring(0, 20)}...` : 'No token found');
      return token;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
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

      console.log('🔍 Refreshing token...');
      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      console.log('🔍 Refresh token response:', {
        success: response.data.success,
        hasData: !!response.data.data,
        message: response.data.message
      });

      if (response.data.success && response.data.data && response.data.data.token) {
        console.log('🔍 Token refresh successful, updating storage');
        await AsyncStorage.setItem('userToken', response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
        return response.data.data.token;
      }

      throw new Error('Failed to refresh token - invalid response format');
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return null;
    }
  }

  // Handle authentication failure
  private async handleAuthFailure() {
    try {
      console.log('🔍 Handling authentication failure - clearing auth data');
      await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
      
      // Trigger logout callback if set
      if (this.onTokenExpiredCallback) {
        console.log('🔍 Triggering token expired callback');
        this.onTokenExpiredCallback();
      } else {
        console.log('⚠️ No token expired callback set');
      }
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      console.log('🔍 API Client - Request method called');
      console.log('🔍 API Client - Config method:', config.method);
      console.log('🔍 API Client - Config URL:', config.url);
      console.log('🔍 API Client - Config headers:', config.headers);
      
      // If data is FormData, don't set Content-Type header (let browser set it)
      // Check for both standard FormData and React Native FormData
      const isFormData = config.data instanceof FormData || 
                        (config.data && typeof config.data === 'object' && 
                         config.data.constructor && 
                         config.data.constructor.name === 'FormData') ||
                        (config.data && typeof config.data === 'object' && 
                         config.data.append && typeof config.data.append === 'function');
      
      if (isFormData) {
        delete config.headers?.['Content-Type'];
      } else {
        // Ensure Content-Type is set for JSON data
        if (config.data && typeof config.data === 'object') {
          config.headers = config.headers || {};
          config.headers['Content-Type'] = 'application/json';
        }
      }
      
      console.log('🔍 API Client - About to make request with axios');
      const response: AxiosResponse<ApiResponse<T>> = await this.client(config);
      console.log('🔍 API Client - Response received:', response.status);
      console.log('🔍 API Client - Response data:', response.data);
      console.log('🔍 API Client - Response success field:', response.data?.success);
      console.log('🔍 API Client - Response data field:', response.data?.data);
      return response.data;
    } catch (error) {
      console.log('🔍 API Client - Request failed:', error);
      return this.handleError(error as AxiosError);
    }
  }

  // Handle API errors
  private handleError(error: AxiosError): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      // If the server response already has the correct structure, return it
      if (data && typeof data === 'object' && 'success' in data) {
        return data as ApiResponse;
      }
      
      // Otherwise, wrap it in the expected structure
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