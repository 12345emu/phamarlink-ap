import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import chatService, { ChatMessage, ChatConversation } from '../services/chatService';

interface ChatContextType {
  // State
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: (professionalId: number, subject: string, initialMessage: string) => Promise<boolean>;
  sendMessage: (conversationId: string, message: string) => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: ChatConversation | null) => void;
  clearError: () => void;
  
  // WebSocket
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await chatService.getConversations();
      if (response.success && response.data) {
        setConversations(response.data);
      } else {
        setError(response.message || 'Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await chatService.getMessages(conversationId);
      if (response.success && response.data) {
        setMessages(response.data);
      } else {
        setError(response.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create new conversation
  const createConversation = useCallback(async (
    professionalId: number, 
    subject: string, 
    initialMessage: string
  ): Promise<boolean> => {
    if (!user) return false;
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await chatService.createConversation({
        professional_id: professionalId,
        subject,
        initial_message: initialMessage
      });
      
      if (response.success && response.data) {
        // Reload conversations to get the new one
        await loadConversations();
        return true;
      } else {
        setError(response.message || 'Failed to create conversation');
        return false;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadConversations]);

  // Send message
  const sendMessage = useCallback(async (conversationId: string, message: string): Promise<boolean> => {
    if (!user) return false;
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;
    
    try {
      // Try WebSocket first
      if (chatService.isWebSocketConnected()) {
        const success = chatService.sendMessage(parseInt(conversationId), message);
        if (success) {
          return true;
        }
      }
      
      // Fallback to REST API
      const response = await chatService.markMessagesAsRead(conversationId);
      return response.success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;
    
    try {
      // Try WebSocket first
      if (chatService.isWebSocketConnected()) {
        chatService.markAsRead(parseInt(conversationId));
      } else {
        // Fallback to REST API
        await chatService.markMessagesAsRead(conversationId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  // Connect WebSocket
  const connectWebSocket = useCallback(async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token || isConnected) return;
    
    try {
      await chatService.connectWebSocket(token);
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setIsConnected(false);
    }
  }, [isConnected]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    chatService.disconnectWebSocket();
    setIsConnected(false);
    console.log('🔌 WebSocket disconnected');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    if (!isConnected) return;

    // Handle new messages
    const handleNewMessage = (message: ChatMessage) => {
      console.log('📨 New message received:', message);
      
      // Add message to current conversation if it matches
      if (currentConversation && message.conversation_id === currentConversation.id) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update conversations list with new last message
      setConversations(prev => prev.map(conv => 
        conv.id === message.conversation_id 
          ? { ...conv, last_message: message.message, last_message_time: message.created_at }
          : conv
      ));
    };

    // Handle message sent confirmation
    const handleMessageSent = (message: ChatMessage) => {
      console.log('✅ Message sent confirmation:', message);
      
      // Add message to current conversation if it matches
      if (currentConversation && message.conversation_id === currentConversation.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    // Handle typing indicators
    const handleTyping = (data: { conversationId: number; userId: number; isTyping: boolean }) => {
      console.log('⌨️ Typing indicator:', data);
      // You can implement typing indicators here if needed
    };

    // Handle messages read
    const handleMessagesRead = (data: { conversationId: number; userId: number }) => {
      console.log('👁️ Messages read:', data);
      // Update message read status if needed
    };

    // Handle connection status
    const handleConnected = (data: { userId: number }) => {
      console.log('🔗 WebSocket connected for user:', data.userId);
      setIsConnected(true);
    };

    // Handle errors
    const handleError = (error: { message: string }) => {
      console.error('❌ WebSocket error:', error);
      setError(error.message);
    };

    // Register event handlers
    chatService.onNewMessage(handleNewMessage);
    chatService.onMessageSent(handleMessageSent);
    chatService.onTyping(handleTyping);
    chatService.onMessagesRead(handleMessagesRead);
    chatService.onConnected(handleConnected);
    chatService.onError(handleError);

    // Cleanup
    return () => {
      chatService.offNewMessage(handleNewMessage);
      chatService.offMessageSent(handleMessageSent);
      chatService.offTyping(handleTyping);
      chatService.offMessagesRead(handleMessagesRead);
      chatService.offConnected(handleConnected);
      chatService.offError(handleError);
    };
  }, [isConnected, currentConversation]);

  // Auto-connect WebSocket when user logs in
  useEffect(() => {
    if (user && !isConnected) {
      connectWebSocket();
    } else if (!user) {
      disconnectWebSocket();
    }
  }, [user, isConnected, connectWebSocket, disconnectWebSocket]);

  // Load conversations when user changes
  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [user, loadConversations]);

  // Load messages when current conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id.toString());
    } else {
      setMessages([]);
    }
  }, [currentConversation, loadMessages]);

  const value: ChatContextType = {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    isConnected,
    
    // Actions
    loadConversations,
    loadMessages,
    createConversation,
    sendMessage,
    markAsRead,
    setCurrentConversation,
    clearError,
    
    // WebSocket
    connectWebSocket,
    disconnectWebSocket,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
