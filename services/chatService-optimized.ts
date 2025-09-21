import { apiClient, ApiResponse } from './apiClient';
import { API_ENDPOINTS } from '../constants/API';

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
  sender_name?: string;
  sender_type?: string;
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
  updated_at?: string;
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

// WebSocket connection management
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
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
          console.log('🔗 WebSocket connected');
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
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
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

// Optimized Chat Service
class ChatService {
  private wsManager = new WebSocketManager();
  private messageCache = new Map<string, ChatMessage[]>();
  private conversationCache = new Map<string, ChatConversation>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = new Map<string, number>();

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
    // This would integrate with your event system
    // For now, we'll use a simple callback system
    if (this.eventCallbacks && this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  private eventCallbacks: { [key: string]: Function[] } = {};

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
      await this.wsManager.connect(token);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      return false;
    }
  }

  // Get conversations with caching
  async getConversations(params?: {
    page?: number;
    limit?: number;
    forceRefresh?: boolean;
  }): Promise<ApiResponse<{ conversations: ChatConversation[]; pagination: any }>> {
    try {
      const cacheKey = `conversations_${params?.page || 1}_${params?.limit || 20}`;
      
      // Check cache first
      if (!params?.forceRefresh && this.isCacheValid(cacheKey)) {
        const cached = this.conversationCache.get(cacheKey);
        if (cached) {
          return {
            success: true,
            data: { conversations: [cached], pagination: {} }
          };
        }
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.CHAT.CONVERSATIONS}?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      
      if (response && typeof response === 'object') {
        if ('success' in response) {
          const result = response as ApiResponse<{ conversations: ChatConversation[]; pagination: any }>;
          
          // Cache the result
          if (result.success && result.data) {
            this.updateCache(cacheKey, result.data.conversations);
          }
          
          return result;
        } else if ((response as any).data) {
          const result = {
            success: true,
            data: (response as any).data
          };
          
          // Cache the result
          if (result.data) {
            this.updateCache(cacheKey, result.data.conversations);
          }
          
          return result;
        }
      }
      
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'Invalid Response',
      };
    } catch (error: any) {
      console.error('❌ Get conversations error:', error);
      return this.handleError(error, 'Failed to fetch conversations');
    }
  }

  // Get conversation with messages (cached)
  async getConversation(conversationId: string, params?: {
    page?: number;
    limit?: number;
    forceRefresh?: boolean;
  }): Promise<ApiResponse<{ conversation: ChatConversation; messages: ChatMessage[]; pagination: any }>> {
    try {
      const cacheKey = `conversation_${conversationId}_${params?.page || 1}_${params?.limit || 50}`;
      
      // Check cache first
      if (!params?.forceRefresh && this.isCacheValid(cacheKey)) {
        const cachedMessages = this.messageCache.get(conversationId);
        const cachedConversation = this.conversationCache.get(conversationId);
        
        if (cachedMessages && cachedConversation) {
          return {
            success: true,
            data: {
              conversation: cachedConversation,
              messages: cachedMessages,
              pagination: {}
            }
          };
        }
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.CHAT.CONVERSATIONS}/${conversationId}?${queryParams.toString()}`;
      const response = await apiClient.get(url);
      
      if (response && typeof response === 'object') {
        if ('success' in response) {
          const result = response as ApiResponse<{ conversation: ChatConversation; messages: ChatMessage[]; pagination: any }>;
          
          // Cache the result
          if (result.success && result.data) {
            this.messageCache.set(conversationId, result.data.messages);
            this.conversationCache.set(conversationId, result.data.conversation);
            this.updateCache(cacheKey, result.data);
          }
          
          return result;
        } else if ((response as any).data) {
          const result = {
            success: true,
            data: (response as any).data
          };
          
          // Cache the result
          if (result.data) {
            this.messageCache.set(conversationId, result.data.messages);
            this.conversationCache.set(conversationId, result.data.conversation);
            this.updateCache(cacheKey, result.data);
          }
          
          return result;
        }
      }
      
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'Invalid Response',
      };
    } catch (error: any) {
      console.error('❌ Get conversation error:', error);
      return this.handleError(error, 'Failed to fetch conversation');
    }
  }

  // Create conversation
  async createConversation(data: CreateConversationData): Promise<ApiResponse<{ conversation: ChatConversation; message: ChatMessage }>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CHAT.CREATE_CONVERSATION, data);
      
      if (response && typeof response === 'object') {
        if ('success' in response) {
          return response as ApiResponse<any>;
        } else if ((response as any).data) {
          return {
            success: true,
            data: (response as any).data
          };
        }
      }
      
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'Invalid Response',
      };
    } catch (error: any) {
      console.error('❌ Create conversation error:', error);
      return this.handleError(error, 'Failed to create conversation');
    }
  }

  // Send message via WebSocket (preferred) or HTTP fallback
  async sendMessage(conversationId: string, data: SendMessageData): Promise<boolean> {
    try {
      // Try WebSocket first
      if (this.wsManager.isConnected()) {
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
          return true;
        }
      }
      
      // Fallback to HTTP
      const response = await apiClient.post(
        `${API_ENDPOINTS.CHAT.SEND_MESSAGE(conversationId)}`,
        data
      );
      
      return response && typeof response === 'object';
    } catch (error) {
      console.error('❌ Send message error:', error);
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
      
      // Fallback to HTTP
      const response = await apiClient.patch(`${API_ENDPOINTS.CHAT.MARK_AS_READ(conversationId)}`);
      return response && typeof response === 'object';
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      return false;
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CHAT.UNREAD_COUNT);
      
      if (response && typeof response === 'object') {
        let result: ApiResponse<{ total_unread: number; conversations_with_unread: number }>;
        
        if ('success' in response) {
          result = response as ApiResponse<{ total_unread: number; conversations_with_unread: number }>;
        } else if ((response as any).data) {
          result = {
            success: true,
            data: (response as any).data
          };
        } else {
          return {
            success: false,
            message: 'Invalid response from server',
            error: 'Invalid Response',
          };
        }
        
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
    } catch (error: any) {
      console.error('❌ Get unread count error:', error);
      return this.handleError(error, 'Failed to get unread count');
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

  // Error handling
  private handleError(error: any, defaultMessage: string): ApiResponse<any> {
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
          message: 'Access denied.',
          error: 'Authorization Error',
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
          message: data?.message || defaultMessage,
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
        message: defaultMessage,
        error: 'Unknown Error',
      };
    }
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
}

export const chatService = new ChatService();
