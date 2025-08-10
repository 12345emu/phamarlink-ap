// API Configuration Constants
export const API_CONFIG = {
  // Base URL for development (change this for production)
  BASE_URL: 'http://172.20.10.3:3000/api',
  
  // API Version
  VERSION: 'v1',
  
  // Timeout settings
  TIMEOUT: 10000, // 10 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
  },
  
  // Users
  USERS: {
    LIST: '/users',
    GET_BY_ID: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DEACTIVATE: (id: string) => `/users/${id}/deactivate`,
  },
  
  // Healthcare Professionals
  PROFESSIONALS: {
    LIST: '/professionals',
    GET_BY_ID: (id: string) => `/professionals/${id}`,
    UPDATE: (id: string) => `/professionals/${id}`,
    DEACTIVATE: (id: string) => `/professionals/${id}/deactivate`,
  },
  
  // Facilities (Hospitals, Pharmacies, Clinics)
  FACILITIES: {
    LIST: '/facilities',
    GET_BY_ID: (id: string) => `/facilities/${id}`,
    SEARCH_NEARBY: '/facilities/nearby',
    ADD_REVIEW: (id: string) => `/facilities/${id}/reviews`,
  },
  
  // Medicines
  MEDICINES: {
    LIST: '/medicines',
    GET_BY_ID: (id: string) => `/medicines/${id}`,
    CREATE: '/medicines',
    UPDATE: (id: string) => `/medicines/${id}`,
    DELETE: (id: string) => `/medicines/${id}`,
    SEARCH_BY_CATEGORY: '/medicines/category',
    SEARCH_BY_SYMPTOM: '/medicines/symptom',
  },
  
  // Appointments
  APPOINTMENTS: {
    LIST: '/appointments',
    GET_BY_ID: (id: string) => `/appointments/${id}`,
    CREATE: '/appointments',
    UPDATE_STATUS: (id: string) => `/appointments/${id}/status`,
    CANCEL: (id: string) => `/appointments/${id}/cancel`,
    AVAILABLE_SLOTS: '/appointments/available-slots',
  },
  
  // Orders
  ORDERS: {
    LIST: '/orders',
    GET_BY_ID: (id: string) => `/orders/${id}`,
    CREATE: '/orders',
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
    TRACK: (id: string) => `/orders/${id}/track`,
  },
  
  // Chat
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    CREATE_CONVERSATION: '/chat/conversations',
    SEND_MESSAGE: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    MARK_AS_READ: (conversationId: string) => `/chat/conversations/${conversationId}/read`,
    UNREAD_COUNT: '/chat/unread-count',
  },
  
  // Reviews
  REVIEWS: {
    LIST: '/reviews',
    GET_BY_ID: (id: string) => `/reviews/${id}`,
    CREATE: '/reviews',
    UPDATE: (id: string) => `/reviews/${id}`,
    DELETE: (id: string) => `/reviews/${id}`,
    STATISTICS: '/reviews/statistics',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    GET_BY_ID: (id: string) => `/notifications/${id}`,
    MARK_AS_READ: (id: string) => `/notifications/${id}/read`,
    DELETE: (id: string) => `/notifications/${id}`,
    PREFERENCES: '/notifications/preferences',
  },
  
  // Search
  SEARCH: {
    GLOBAL: '/search',
    MEDICINES: '/search/medicines',
    SYMPTOMS: '/search/symptoms',
  },
  
  // Utilities
  UTILS: {
    HEALTH_CHECK: '/utils/health',
    SYSTEM_INFO: '/utils/system-info',
    DB_STATS: '/utils/db-stats',
    VALIDATE_DATA: '/utils/validate',
    VALIDATE_FILE: '/utils/validate-file',
    GENERATE_ID: '/utils/generate-id',
  },
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
}; 