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
        console.log('🔍 WebSocket connecting to:', wsUrl);
        console.log('🔍 Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
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
          console.error('❌ WebSocket error details:', {
            type: (error as any).type,
            target: (error as any).target?.url,
            readyState: (error as any).target?.readyState
          });
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

  onMessage(type: string, handler: Function) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  // Alias for onMessage for easier use
  on(type: string, handler: Function) {
    this.onMessage(type, handler);
  }

  offMessage(type: string, handler: Function) {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  // Alias for offMessage for easier use
  off(type: string, handler: Function) {
    this.offMessage(type, handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.token = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Send a message through WebSocket
  sendMessage(conversationId: number, message: string, messageType: string = 'text'): boolean {
    return this.send({
      type: 'send_message',
      data: {
        conversationId,
        message,
        messageType
      }
    });
  }

  // Send typing indicator
  sendTyping(conversationId: number, isTyping: boolean): boolean {
    return this.send({
      type: 'typing',
      data: {
        conversationId,
        isTyping
      }
    });
  }

  // Mark messages as read
  markAsRead(conversationId: number): boolean {
    return this.send({
      type: 'mark_read',
      data: {
        conversationId
      }
    });
  }
}

// Chat interfaces
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  message_type: 'text' | 'image' | 'file';
  attachment_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    user_type: string;
    user_profile_image?: string;
  };
}

export interface ChatConversation {
  id: number;
  user_id: number;
  facility_id: number;
  professional_id: number;
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
  user_profile_image?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface CreateConversationData {
  professional_id: number;
  subject: string;
  initial_message: string;
}

export interface CreateConversationResponse {
  conversationId: number;
  messageId: number;
}

// Chat service class
class ChatService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = new WebSocketManager();
  }

  // WebSocket methods
  async connect(token: string): Promise<void> {
    return this.wsManager.connect(token);
  }

  async connectWebSocket(token: string): Promise<void> {
    return this.wsManager.connect(token);
  }

  disconnect() {
    this.wsManager.disconnect();
  }

  disconnectWebSocket() {
    this.wsManager.disconnect();
  }

  isConnected(): boolean {
    return this.wsManager.isConnected();
  }

  isWebSocketConnected(): boolean {
    return this.wsManager.isConnected();
  }

  // Event handling methods
  on(type: string, handler: Function) {
    this.wsManager.on(type, handler);
  }

  off(type: string, handler: Function) {
    this.wsManager.off(type, handler);
  }


  // Message event handlers
  onNewMessage(handler: (message: ChatMessage) => void) {
    this.wsManager.onMessage('new_message', (data) => {
      handler(data.data);
    });
  }

  onMessageSent(handler: (message: ChatMessage) => void) {
    this.wsManager.onMessage('message_sent', (data) => {
      handler(data.data);
    });
  }

  onTyping(handler: (data: { conversationId: number; userId: number; isTyping: boolean }) => void) {
    this.wsManager.onMessage('typing', (data) => {
      handler(data.data);
    });
  }

  onMessagesRead(handler: (data: { conversationId: number; userId: number }) => void) {
    this.wsManager.onMessage('messages_read', (data) => {
      handler(data.data);
    });
  }

  onConnected(handler: (data: { userId: number }) => void) {
    this.wsManager.onMessage('connected', (data) => {
      handler(data);
    });
  }

  onError(handler: (error: { message: string }) => void) {
    this.wsManager.onMessage('error', (data) => {
      handler(data);
    });
  }

  // Remove event handlers
  offNewMessage(handler: (message: ChatMessage) => void) {
    this.wsManager.offMessage('new_message', handler);
  }

  offMessageSent(handler: (message: ChatMessage) => void) {
    this.wsManager.offMessage('message_sent', handler);
  }

  offTyping(handler: (data: { conversationId: number; userId: number; isTyping: boolean }) => void) {
    this.wsManager.offMessage('typing', handler);
  }

  offMessagesRead(handler: (data: { conversationId: number; userId: number }) => void) {
    this.wsManager.offMessage('messages_read', handler);
  }

  offConnected(handler: (data: { userId: number }) => void) {
    this.wsManager.offMessage('connected', handler);
  }

  offError(handler: (error: { message: string }) => void) {
    this.wsManager.offMessage('error', handler);
  }

  // Send message via WebSocket
  sendMessage(conversationId: number, message: string, messageType: 'text' | 'image' | 'file' = 'text'): boolean {
    return this.wsManager.send({
      type: 'send_message',
      data: {
        conversationId,
        message,
        messageType
      }
    });
  }

  // Send typing indicator
  sendTyping(conversationId: number, isTyping: boolean): boolean {
    return this.wsManager.send({
      type: 'typing',
      data: {
        conversationId,
        isTyping
      }
    });
  }

  // Mark messages as read
  markAsRead(conversationId: number): boolean {
    return this.wsManager.send({
      type: 'mark_read',
      data: {
        conversationId
      }
    });
  }

  // REST API methods
  async getConversations(): Promise<ApiResponse<ChatConversation[]>> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CHAT.CONVERSATIONS);
      return response as ApiResponse<ChatConversation[]>;
    } catch (error) {
      console.error('Get conversations error:', error);
      return {
        success: false,
        message: 'Failed to fetch conversations. Please try again.',
        error: 'Conversation Fetch Error',
      };
    }
  }

  async getMessages(conversationId: string): Promise<ApiResponse<ChatMessage[]>> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CHAT.GET_MESSAGES(conversationId));
      return response as ApiResponse<ChatMessage[]>;
    } catch (error) {
      console.error('Get messages error:', error);
      return {
        success: false,
        message: 'Failed to fetch messages. Please try again.',
        error: 'Message Fetch Error',
      };
    }
  }

  async createConversation(data: CreateConversationData): Promise<ApiResponse<CreateConversationResponse>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CHAT.CREATE_CONVERSATION, data);
      return response as ApiResponse<CreateConversationResponse>;
    } catch (error) {
      console.error('Create conversation error:', error);
      return {
        success: false,
        message: 'Failed to create conversation. Please try again.',
        error: 'Conversation Creation Error',
      };
    }
  }

  async markMessagesAsRead(conversationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.CHAT.MARK_AS_READ(conversationId));
      return response as ApiResponse<any>;
    } catch (error) {
      console.error('Mark messages as read error:', error);
      return {
        success: false,
        message: 'Failed to mark messages as read.',
        error: 'Mark Read Error',
      };
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
