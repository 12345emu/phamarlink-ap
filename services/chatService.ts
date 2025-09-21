import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

// WebSocket connection management
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private messageHandlers: Map<string, Function[]> = new Map();
  private token: string | null = null;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;
      this.token = token;

      try {
        const wsUrl = `${API_ENDPOINTS.WEBSOCKET}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log('🔄 Scheduling WebSocket reconnection...');
            this.scheduleReconnect();
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached, giving up');
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnecting = false;
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token).catch(error => {
          console.error('❌ Reconnect failed:', error);
        });
      }
    }, delay);
  }

  private handleMessage(message: any) {
    const { type } = message;
    const handlers = this.messageHandlers.get(type) || [];
    
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`❌ Error in message handler for ${type}:`, error);
      }
    });
  }

  send(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  on(type: string, handler: Function) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  off(type: string, handler: Function) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Types
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'prescription';
  attachment_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  // Additional fields from the API response
  first_name?: string;
  last_name?: string;
  email?: string;
  user_type?: string;
  user_profile_image?: string;
}

export interface ChatConversation {
  id: number;
  user_id: number;
  facility_id: number;
  subject: string;
  status: 'active' | 'closed' | 'archived';
  conversation_type: 'general' | 'prescription' | 'appointment' | 'emergency';
  last_activity: string;
  created_at: string;
  updated_at: string;
  // Additional fields from the API response
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  facility_name?: string;
  facility_type?: string;
  professional_first_name?: string;
  professional_last_name?: string;
  professional_profile_image?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface CreateConversationData {
  facility_id: number;
  subject: string;
  initial_message: string;
  message_type?: 'general' | 'prescription' | 'appointment' | 'emergency';
}

export interface SendMessageData {
  message: string;
  message_type?: 'text' | 'image' | 'file' | 'prescription';
  attachment_url?: string;
}

// Optimized Chat Service with WebSocket support
class ChatService {
  private wsManager = new WebSocketManager();
  private messageCache = new Map<string, ChatMessage[]>();
  private conversationCache = new Map<string, ChatConversation>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = new Map<string, number>();
  private eventCallbacks: { [key: string]: Function[] } = {};

  constructor() {
    // Set up WebSocket message handlers
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    // Handle new messages
    this.wsManager.on('new_message', (message: any) => {
      const { data } = message;
      const conversationId = data.conversation_id.toString();
      
      // Add to cache
      if (this.messageCache.has(conversationId)) {
        this.messageCache.get(conversationId)!.push(data);
      }
      
      // Emit event for UI
      this.emit('new_message', data);
    });

    // Handle typing indicators
    this.wsManager.on('typing', (message: any) => {
      this.emit('typing', message.data);
    });

    // Handle read receipts
    this.wsManager.on('messages_read', (message: any) => {
      this.emit('messages_read', message.data);
    });

    // Handle connection status
    this.wsManager.on('connection', (message: any) => {
      this.emit('connection', message);
    });
  }

  private emit(event: string, data: any) {
    if (this.eventCallbacks && this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  on(event: string, callback: Function) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.eventCallbacks[event]) {
      const index = this.eventCallbacks[event].indexOf(callback);
      if (index > -1) {
        this.eventCallbacks[event].splice(index, 1);
      }
    }
  }

  // Initialize WebSocket connection
  async initializeWebSocket(token: string): Promise<boolean> {
    try {
      console.log('🔍 ChatService - Initializing WebSocket with token:', token ? 'present' : 'missing');
      await this.wsManager.connect(token);
      const connected = this.wsManager.isConnected();
      console.log('🔍 ChatService - WebSocket connection result:', connected);
      return connected;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      return false;
    }
  }
  // Get all conversations for the current user
  async getConversations(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ conversations: ChatConversation[]; pagination: any }>> {
    try {
      console.log('🔍 ChatService - getConversations called with params:', params);
      
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.CHAT.CONVERSATIONS}?${queryParams.toString()}`;
      console.log('🔍 ChatService - Making request to:', url);
      
      const response = await apiClient.get(url);
      console.log('🔍 ChatService - Raw response received:', response);
      console.log('🔍 ChatService - Response type:', typeof response);
      console.log('🔍 ChatService - Response data:', response.data);
      
      // Ensure we always return a valid response object
      if (response && typeof response === 'object') {
        console.log('✅ ChatService - Valid response structure, returning data');
        // Check if the response already has success field
        if ('success' in response) {
          return response as ApiResponse<{ conversations: ChatConversation[]; pagination: any }>;
        } else if ((response as any).data && typeof (response as any).data === 'object') {
          // Wrap the response data in the proper ApiResponse format
          return {
            success: true,
            data: (response as any).data as { conversations: ChatConversation[]; pagination: any }
          };
        } else {
          console.log('❌ ChatService - Invalid response structure:', response);
          return {
            success: false,
            message: 'Invalid response from server',
            error: 'Invalid Response',
          };
        }
      } else {
        console.log('❌ ChatService - Invalid response structure:', response);
        return {
          success: false,
          message: 'Invalid response from server',
          error: 'Invalid Response',
        };
      }
    } catch (error: any) {
      console.error('❌ ChatService - Get conversations error:', error);
      console.error('❌ ChatService - Error type:', typeof error);
      console.error('❌ ChatService - Error message:', error.message);
      console.error('❌ ChatService - Error response:', error.response);
      
      // Handle specific error types
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          return {
            success: false,
            message: 'Authentication required. Please log in again.',
            error: 'Authentication Error',
          };
        } else if (status === 403) {
          return {
            success: false,
            message: 'Access denied. You do not have permission to view conversations.',
            error: 'Permission Error',
          };
        } else if (status >= 500) {
          return {
            success: false,
            message: 'Server error. Please try again later.',
            error: 'Server Error',
          };
        } else {
          return {
            success: false,
            message: data?.message || 'Failed to fetch conversations. Please try again.',
            error: 'API Error',
          };
        }
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.',
          error: 'Network Error',
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred. Please try again.',
          error: 'Unknown Error',
        };
      }
    }
  }

  // Get conversation by ID with messages
  async getConversation(conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ conversation: ChatConversation; messages: ChatMessage[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.CHAT.CONVERSATIONS}/${conversationId}?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      
      // Ensure we always return a valid response object
      if (response && typeof response === 'object') {
        if ('success' in response) {
          return response as ApiResponse<{ conversation: ChatConversation; messages: ChatMessage[]; pagination: any }>;
        } else if ((response as any).data && typeof (response as any).data === 'object') {
          return {
            success: true,
            data: (response as any).data as { conversation: ChatConversation; messages: ChatMessage[]; pagination: any }
          };
        }
      }
      
      console.error('Invalid response structure:', response);
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'Invalid Response',
      };
    } catch (error) {
      console.error('Get conversation error:', error);
      return {
        success: false,
        message: 'Failed to fetch conversation. Please try again.',
        error: 'Conversation Fetch Error',
      };
    }
  }

  // Create new conversation
  async createConversation(data: CreateConversationData): Promise<ApiResponse<{ conversation: ChatConversation; message: ChatMessage }>> {
    try {
      console.log('🔍 ChatService - Creating conversation with data:', data);
      console.log('🔍 ChatService - POST to:', API_ENDPOINTS.CHAT.CREATE_CONVERSATION);
      
      const response = await apiClient.post(API_ENDPOINTS.CHAT.CREATE_CONVERSATION, data);
      
      console.log('🔍 ChatService - Create conversation response:', response);
      
      // Ensure we always return a valid response object
      if (response && typeof response === 'object') {
        if ('success' in response) {
          return response as ApiResponse<any>;
        } else if ((response as any).data && typeof (response as any).data === 'object') {
          return {
            success: true,
            data: (response as any).data
          };
        }
      }
      
      console.error('Invalid response structure:', response);
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'Invalid Response',
      };
    } catch (error) {
      console.error('❌ ChatService - Create conversation error:', error);
      console.error('❌ ChatService - Error response:', error.response);
      return {
        success: false,
        message: 'Failed to create conversation. Please try again.',
        error: 'Conversation Creation Error',
      };
    }
  }

  // Send message via WebSocket (preferred) or HTTP fallback
  async sendMessage(conversationId: string, data: SendMessageData): Promise<boolean> {
    try {
      console.log('🔍 ChatService - Sending message:', { conversationId, data });
      
      // Try WebSocket first
      if (this.wsManager.isConnected()) {
        console.log('🔍 ChatService - Using WebSocket to send message');
        const success = this.wsManager.send({
          type: 'send_message',
          data: {
            conversationId: conversationId,
            message: data.message,
            messageType: data.message_type || 'text',
            attachmentUrl: data.attachment_url
          }
        });
        
        if (success) {
          console.log('✅ ChatService - Message sent via WebSocket');
          return true;
        } else {
          console.log('❌ ChatService - WebSocket send failed, falling back to HTTP');
        }
      } else {
        console.log('🔍 ChatService - WebSocket not connected, using HTTP');
      }
      
      // Always fallback to HTTP for reliability
      console.log('🔍 ChatService - Sending via HTTP:', `${API_ENDPOINTS.CHAT.SEND_MESSAGE(conversationId)}`);
      const response = await apiClient.post(
        `${API_ENDPOINTS.CHAT.SEND_MESSAGE(conversationId)}`,
        data
      );
      
      console.log('🔍 ChatService - HTTP response:', response);
      
      if (response && typeof response === 'object') {
        if ('success' in response) {
          const success = (response as any).success;
          console.log('✅ ChatService - HTTP send result:', success);
          return success;
        } else if ((response as any).data) {
          console.log('✅ ChatService - HTTP send successful (has data)');
          return true;
        }
      }
      
      console.log('❌ ChatService - HTTP send failed - no valid response');
      return false;
    } catch (error) {
      console.error('❌ Send message error:', error);
      console.error('❌ Error response:', error.response?.data);
      return false;
    }
  }

  // Join conversation via WebSocket
  joinConversation(conversationId: string): boolean {
    if (this.wsManager.isConnected()) {
      return this.wsManager.send({
        type: 'join_conversation',
        data: { conversationId: conversationId }
      });
    }
    return false;
  }

  // Leave conversation via WebSocket
  leaveConversation(conversationId: string): boolean {
    if (this.wsManager.isConnected()) {
      return this.wsManager.send({
        type: 'leave_conversation',
        data: { conversationId: conversationId }
      });
    }
    return false;
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): boolean {
    if (this.wsManager.isConnected()) {
      return this.wsManager.send({
        type: 'typing',
        data: { conversationId: conversationId, isTyping: isTyping }
      });
    }
    return false;
  }

  // Mark messages as read
  async markAsRead(conversationId: string): Promise<boolean> {
    try {
      // Try WebSocket first
      if (this.wsManager.isConnected()) {
        const success = this.wsManager.send({
          type: 'mark_read',
          data: { conversationId: conversationId }
        });
        
        if (success) {
          return true;
        }
      }
      
      // Always fallback to HTTP for reliability
      const response = await apiClient.patch(`${API_ENDPOINTS.CHAT.MARK_AS_READ(conversationId)}`);
      
      if (response && typeof response === 'object') {
        if ('success' in response) {
          return (response as any).success;
        } else if ((response as any).data) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      return false;
    }
  }

  // Cache management
  private isCacheValid(key: string): boolean {
    const lastUpdate = this.lastCacheUpdate.get(key);
    if (!lastUpdate) return false;
    return Date.now() - lastUpdate < this.cacheExpiry;
  }

  private updateCache(key: string, data: any) {
    this.lastCacheUpdate.set(key, Date.now());
  }

  // Clear cache
  clearCache() {
    this.messageCache.clear();
    this.conversationCache.clear();
    this.lastCacheUpdate.clear();
  }

  // Disconnect WebSocket
  disconnect() {
    this.wsManager.disconnect();
    this.clearCache();
  }

  // Check if WebSocket is connected
  isWebSocketConnected(): boolean {
    return this.wsManager.isConnected();
  }

  // Update conversation status
  async updateConversationStatus(conversationId: string, status: 'active' | 'closed' | 'archived'): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.patch(
        `${API_ENDPOINTS.CHAT.CONVERSATIONS}/${conversationId}`,
        { status }
      );
      
      // Ensure we always return a valid response object
      if (response && typeof response === 'object') {
        if ('success' in response) {
          return response as ApiResponse<any>;
        } else if ((response as any).data && typeof (response as any).data === 'object') {
          return {
            success: true,
            data: (response as any).data
          };
        }
      }
      
      console.error('Invalid response structure:', response);
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'Invalid Response',
      };
    } catch (error) {
      console.error('Update conversation status error:', error);
      return {
        success: false,
        message: 'Failed to update conversation status.',
        error: 'Status Update Error',
      };
    }
  }

  // Get unread message count
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CHAT.UNREAD_COUNT);
      
      // Ensure we always return a valid response object
      if (response && typeof response === 'object') {
        let result: ApiResponse<{ total_unread: number; conversations_with_unread: number }>;
        
        if ('success' in response) {
          result = response as ApiResponse<{ total_unread: number; conversations_with_unread: number }>;
        } else if ((response as any).data && typeof (response as any).data === 'object') {
          result = {
            success: true,
            data: (response as any).data as { total_unread: number; conversations_with_unread: number }
          };
        } else {
          return {
            success: false,
            message: 'Invalid response from server',
            error: 'Invalid Response',
          };
        }
        
        // Transform the backend response to match the expected format
        if (result.success && result.data) {
          return {
            success: true,
            data: {
              count: result.data.total_unread || 0
            }
          };
        } else {
          return {
            success: false,
            message: result.message || 'Failed to get unread count',
            error: result.error || 'Unread Count Error',
          };
        }
      } else {
        return {
          success: false,
          message: 'Invalid response from server',
          error: 'Invalid Response',
        };
      }
    } catch (error) {
      console.error('Get unread count error:', error);
      return {
        success: false,
        message: 'Failed to get unread count.',
        error: 'Unread Count Error',
      };
    }
  }
}

export const chatService = new ChatService();
